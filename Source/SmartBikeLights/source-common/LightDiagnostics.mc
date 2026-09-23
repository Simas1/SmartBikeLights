using Toybox.Graphics;
using Toybox.System;
using Toybox.WatchUi;

// Live network diagnostics; controls reuse the existing SBL command pipeline.
(:highMemory)
module LightDiagnostics {
    var networkState = 0;
    var updates = 0;

    var lost = 0;
    var restored = 0;
    var awaitingRecovery = false;
    // One bounded record per SBL control group: target, start, retries, result, elapsed.
    var commands = [null, null];
    var compactFont;

    function stateChanged(state) {
        if (networkState == 2 && state != 2) {
            lost++;
            awaitingRecovery = true;
            finish(0, "Disconnected", System.getTimer());
            finish(2, "Disconnected", System.getTimer());
        } else if (state == 2 && awaitingRecovery) {
            restored++;
            awaitingRecovery = false;
        }
        networkState = state;
    }

    function sent(type, mode, now) {
        if (type == 0 || type == 2) { commands[type == 0 ? 0 : 1] = [mode, now, 0, "Waiting", 0]; }
    }

    function retried(type) {
        var record = commands[type == 0 ? 0 : 1];
        if (record != null && record[3].equals("Waiting")) { record[2]++; }
    }

    function reported(type, mode, now) {
        var record = commands[type == 0 ? 0 : 1];
        if (record != null && record[3].equals("Waiting")) {
            if (mode < 0) { finish(type, "Disconnected", now); }
            else if (mode == record[0]) { finish(type, "Confirm", now); }
        }
    }

    function finish(type, result, now) {
        var record = commands[type == 0 ? 0 : 1];
        if (record != null && record[3].equals("Waiting")) {
            record[3] = result;
            record[4] = now - record[1];
        }
    }

    function commandText(type) {
        var record = commands[type == 0 ? 0 : 1];
        if (record == null) { return "CMD=-- Retry=0"; }
        var text = "CMD=" + record[0] + " Retry=" + record[2] + " " + record[3];
        if (record[3].equals("Confirm") || record[3].equals("Waiting")) {
            text += "=" + (record[3].equals("Waiting") ? System.getTimer() - record[1] : record[4]) + "ms";
        }
        return text;
    }

    var page = 0;
    var pageTime = null;
    var selectedId = null;
    var selectedMode = null;
    var buttons = [];
    var displayedLight = null;

    function advancePage(count, automatic, now) {
        if (count == 0) { page = 0; pageTime = null; return; }
        if (page >= count) { page = 0; }
        if (pageTime == null || now < pageTime) { pageTime = now; }
        if (automatic && now - pageTime >= 3000) {
            page = (page + 1) % count;
            pageTime = now;
        }
    }

    function draw(dc, network, view, interactive, settingsButton) {
        var width = dc.getWidth();
        var height = dc.getHeight();
        var round = width == height;
        var font = Graphics.FONT_XTINY;
        if (round) {
            if (compactFont == null) { compactFont = WatchUi.loadResource(Rez.Fonts.diagnosticsCompact); }
            font = compactFont;
        }
        var lh = dc.getFontHeight(font);
        var maxWidth = width * (round ? 0.84 : 0.94);
        var state = network == null ? 0 : networkState;
        var title = state == 0 ? "No network" : state == 1 ? "Forming network" : state == 2 ? "Network formed" : "Network state: " + state;
        var memory = System.getSystemStats();
        var rows = [title, "Updates=" + updates,
            "MEM=" + (memory.usedMemory / 1024.0).format("%.1f") + "/" + (memory.totalMemory / 1024.0).format("%.1f") + " KB",
            "NET: Lost=" + lost + " Restored=" + restored];
        buttons = [];
        var lights = network == null ? null : network.getBikeLights();
        var count = lights == null ? 0 : lights.size();
        advancePage(count, !interactive, System.getTimer());
        displayedLight = count == 0 ? null : lights[page];
        var y = round ? height * 0.10 : height * 0.08;
        for (var i = 0; i < rows.size(); i++) {
            y = drawRow(dc, rows[i], width, round ? width * 0.70 : maxWidth, y, font, lh, true);
        }
        y += 6;
        drawButton(dc, "Light Device " + (count == 0 ? 0 : page + 1) + "/" + count, width / 2, y, font, interactive && count > 0 ? 1 : 0);
        y += lh + 18;
        if (displayedLight != null) {
            var light = displayedLight;
            var modes = light.getCapableModes();
            if (selectedId != light.identifier || modes == null || modes.indexOf(selectedMode) < 0) {
                selectedId = light.identifier;
                selectedMode = modes == null || modes.size() == 0 ? null : modes.indexOf(light.mode) >= 0 ? light.mode : modes[0];
            }
            var battery = network.getBatteryStatus(light.identifier);
            y = drawRow(dc, "TY=" + light.type + " ID=" + light.identifier + " LM=" + light.mode + " BS=" + (battery == null ? "null" : battery.batteryStatus), width, maxWidth, y, font, lh, true);
            var modeText = "CM=" + modes;
            y = drawRow(dc, modeText, width, maxWidth, y, font, lh, true);
            if (light.type == 0 || light.type == 2) {
                y = drawRow(dc, commandText(light.type), width, maxWidth, y + 4, font, lh, true);
                if (interactive) {
                    var data = view.getLightData(light.type);
                    y += 6;
                    drawButton(dc, "Control: " + ["S", "N", "M"][data[4]], width / 2, y, font, 2);
                    y += lh + 16;
                    var modeLabel = "Mode: " + (selectedMode == null ? "--" : selectedMode);
                    // Center the pair with an 8px edge-to-edge gap, regardless of label width.
                    drawButton(dc, modeLabel, width / 2 - (dc.getTextWidthInPixels("Set Mode", font) + 24) / 2, y, font, selectedMode == null ? 0 : 3);
                    drawButton(dc, "Set Mode", width / 2 + (dc.getTextWidthInPixels(modeLabel, font) + 24) / 2, y, font, selectedMode == null || data[0] == null || data[0].getCapableModes().indexOf(selectedMode) < 0 ? 0 : 4);
                    y += lh + 16;
                }
            }
        }
        if (settingsButton) { drawButton(dc, "Settings", width / 2, y + 4, font, 5); }
    }

    function drawButton(dc, text, center, y, font, action) {
        var w = dc.getTextWidthInPixels(text, font) + 16;
        var h = dc.getFontHeight(font) + 10;
        if (action != 0) {
            dc.drawRectangle(center - w / 2, y, w, h);
            buttons.add([center - w / 2, y, w, h, action]);
        }
        dc.drawText(center, y + 5, font, text, Graphics.TEXT_JUSTIFY_CENTER);
    }

    function tap(location, network, view) {
        for (var i = 0; i < buttons.size(); i++) {
            var b = buttons[i];
            if (location[0] < b[0] || location[0] >= b[0] + b[2] || location[1] < b[1] || location[1] >= b[1] + b[3]) { continue; }
            if (b[4] == 5) { return 5; }
            var lights = network == null ? null : network.getBikeLights();
            if (lights == null || lights.size() == 0) { return 0; }
            if (b[4] == 1) { page = (page + 1) % lights.size(); selectedId = null; return 1; }
            // Ignore a stale page after a network membership change.
            if (page >= lights.size() || displayedLight == null || lights[page].identifier != displayedLight.identifier) { return 0; }
            var light = lights[page];
            var modes = light.getCapableModes();
            if (b[4] == 3 && modes != null && modes.size() > 0) {
                selectedMode = modes[(modes.indexOf(selectedMode) + 1) % modes.size()];
            } else if (b[4] == 2 || b[4] == 4) {
                view.diagnosticControl(light.type, b[4], selectedMode);
            }
            return 1;
        }
        return 0;
    }

    // Wrap raw rows without animation.
    function drawRow(dc, text, width, maxWidth, y, font, lineHeight, paint) {
        while (text.length() > 0) {
            var end = text.length();
            while (end > 1 && dc.getTextWidthInPixels(text.substring(0, end), font) > maxWidth) {
                end--;
            }
            if (end < text.length()) {
                for (var split = end - 1; split > 0; split--) {
                    if (text.substring(split, split + 1).equals(" ")) { end = split + 1; break; }
                }
            }
            if (paint) {
                dc.drawText(width / 2, y, font, text.substring(0, end), Graphics.TEXT_JUSTIFY_CENTER);
            }
            y += lineHeight;
            text = text.substring(end, text.length());
        }
        return y;
    }
}
