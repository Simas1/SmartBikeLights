using Toybox.Math;
using Toybox.Graphics;
using Toybox.WatchUi;

// Shared by touch panels and button-device display panels. Metadata lives in the title so
// old configurations and the configuration parser retain their wire format.
(:highMemory)
module LightPanelGraphics {
    const WHITE = 0xFFFFFF;
    const RED = 0xCC2222;
    var _modeIconsSmall;
    var _modeIconsLarge;
    var _modeIconsWide;
    var _modeIconsExtra;
    var _modeIconsXL;
    var prominentModeIcons = false;
    var matchRuntimeIconToText = false;
    var _modeTitleFont = 2;
    var _modeTitleIconSize = 18;
    var _modeTitleIconY = 0;

    // Load during panel setup, never inside the nested button drawing path.
    function initializeFonts() {
        _modeTitleFont = 2;
        prominentModeIcons = false;
        matchRuntimeIconToText = false;
        if (_modeIconsSmall == null) {
            _modeIconsSmall = WatchUi.loadResource(Rez.Fonts.modeIconsSmall);
            _modeIconsLarge = WatchUi.loadResource(Rez.Fonts.modeIconsLarge);
            _modeIconsWide = WatchUi.loadResource(Rez.Fonts.modeIconsWide);
            _modeIconsExtra = WatchUi.loadResource(Rez.Fonts.modeIconsExtra);
        }
    }

    // [display name, lumens, full-charge hours, explicit icon, title lines]
    function parseTitle(title) {
        if (title == null) { return null; }
        var lines = [];
        var index = title.find("~n");
        while (index != null) {
            lines.add(title.substring(0, index));
            title = title.substring(index + 2, title.length());
            index = title.find("~n");
        }
        lines.add(title);
        var icon = "none";
        var last = lines[lines.size() - 1];
        if (last.equals("@headlight-high") || last.equals("@headlight-medium") || last.equals("@headlight-low") || last.equals("@taillight-high") || last.equals("@taillight-medium") || last.equals("@taillight-low") || last.equals("@sun") || last.equals("@moon") || last.equals("@lightning") || last.equals("@none")) {
            icon = last.substring(1, last.length());
            lines = lines.slice(0, lines.size() - 1);
        }
        if (lines.size() == 0) { return null; }
        var lumens = null;
        var hours = null;
        last = lines[lines.size() - 1];
        var separator = last.find("lm-");
        var end = last.find("h");
        if (lines.size() > 1 && separator != null && end != null && end > separator + 3) {
            lumens = positiveNumber(last.substring(0, separator));
            hours = positiveNumber(last.substring(separator + 3, end));
            if (lumens != null && hours != null && blank(last.substring(end + 1, last.length()))) {
                lines = lines.slice(0, lines.size() - 1);
            } else {
                lumens = null;
                hours = null;
            }
        }
        if (lumens == null && icon.equals("none")) { return null; }
        var name = lines[0];
        for (var i = 1; i < lines.size(); i++) { name += "~n" + lines[i]; }
        return [name, lumens, hours, icon, titleLines(name)];
    }

    function blank(text) {
        var chars = text.toCharArray();
        for (var i = 0; i < chars.size(); i++) {
            if (chars[i] != ' ') { return false; }
        }
        return true;
    }

    function positiveNumber(text) {
        var chars = text.toCharArray();
        var value = "";
        var dots = 0;
        var trailingSpace = false;
        for (var i = 0; i < chars.size(); i++) {
            var c = chars[i];
            if (c == ' ') {
                if (value.length() > 0) { trailingSpace = true; }
                continue;
            }
            if (trailingSpace) { return null; }
            if (c == '.') { dots++; }
            else if (c < '0' || c > '9') { return null; }
            if (dots > 1) { return null; }
            value += c.toString();
        }
        if (value.length() == 0) { return null; }
        var number = value.toFloat();
        return number != null && number > 0 ? number : null;
    }

    // Approximate assumptions, not ANT-reported percentages. Charging, invalid
    // and disconnected readings must never be interpreted as a full battery.
    function batteryPercent(status) {
        if (status == 1) { return 100; }
        if (status == 2) { return 75; }
        if (status == 3) { return 50; }
        if (status == 4) { return 25; }
        if (status == 5) { return 5; }
        return null;
    }

    function remainingMinutes(hours, status) {
        var percent = batteryPercent(status);
        return hours == null || percent == null ? null : hours * 60 * percent / 100;
    }

    function runtimeText(minutes) {
        if (minutes == null) { return "--"; }
        if (minutes < 1) { return "~<1m"; }
        var total = Math.floor(minutes).toNumber();
        if (total < 60) { return "~" + total + "m"; }
        return "~" + (total / 60) + "h" + (total % 60 == 0 ? "" : (total % 60).format("%02d"));
    }

    function brightnessSteps(lumens, maxLumens) {
        if (lumens == null || maxLumens <= 0) { return 0; }
        var steps = Math.round(lumens * 6.0 / maxLumens).toNumber();
        return steps < 1 ? 1 : steps > 6 ? 6 : steps;
    }

    // Filter only manual buttons; automation modes and the stored configuration stay intact.
    function filterModes(settings, allowedModes) {
        if (settings == null || allowedModes == null) { return settings; }
        var result = settings.slice(0, 6);
        result[0] = 0;
        result[1] = 0;
        var index = 6;
        for (var g = 0; g < settings[1]; g++) {
            var count = settings[index];
            var group = [0];
            for (var b = 0; b < count; b++) {
                var k = index + 1 + b * 2;
                if (allowedModes.indexOf(settings[k]) >= 0) {
                    group[0]++;
                    group.addAll([settings[k], settings[k + 1]]);
                }
            }
            if (group[0] > 0) {
                result[0] += group[0];
                result[1]++;
                result.addAll(group);
            }
            index += 1 + count * 2;
        }
        return result;
    }

    // Supply the fixed Control mode / Off row; configuration switching uses the footer.
    function panelSettings(settings) {
        var result = settings.slice(0, 6);
        result[0] += 2;
        result[1]++;
        result.addAll([2, -1, null, 0, "Off"]);
        result.addAll(settings.slice(6, null));
        return result;
    }

    function groupWeight(settings, index) {
        return index == 6 ? 0.5 : 1.0;
    }

    // Each text-only light panel uses the largest font that fits every mode.
    function unifyTextFonts(dc, panel, fontTopPaddings) {
        var font = 4;
        var group = 9;
        for (var i = 0; i < panel[0]; i++) {
            for (var j = 0; j < panel[group]; j++) {
                var button = group + 1 + j * 8;
                if (panel[button] > 0 && panel[button + 2] < font) {
                    font = panel[button + 2];
                }
            }
            group += 1 + panel[group] * 8;
        }
        group = 9;
        for (var i = 0; i < panel[0]; i++) {
            for (var j = 0; j < panel[group]; j++) {
                var button = group + 1 + j * 8;
                if (panel[button] <= 0) { continue; }
                var parts = panel[button + 3];
                var fontHeight = dc.getFontHeight(font);
                var topPadding = StringHelper.getFontTopPadding(font, fontTopPaddings);
                var titleY = panel[button + 5] + (panel[button + 7] - parts.size() / 2 * fontHeight - topPadding) / 2 + 2;
                panel[button + 2] = font;
                for (var k = 1; k < parts.size(); k += 2) {
                    parts[k] = titleY;
                    titleY += fontHeight;
                }
            }
            group += 1 + panel[group] * 8;
        }
    }

    // Explicit name breaks are independent of the ~n metadata delimiter.
    function titleLines(text) {
        // Keep scratch values off the small Edge VM call stack.
        var v = [[], text, null, null, 3];
        while (true) {
            v[2] = v[1].find("~br");
            v[3] = v[1].find("\n");
            v[4] = 3;
            if (v[3] != null && (v[2] == null || v[3] < v[2])) {
                v[2] = v[3];
                v[4] = 1;
            }
            if (v[2] == null) { break; }
            v[0].add(v[1].substring(0, v[2]));
            v[1] = v[1].substring(v[2] + v[4], v[1].length());
        }
        v[0].add(v[1]);
        return v[0];
    }

    function titleWidth(dc, lines, font) {
        var width = 0;
        for (var i = 0; i < lines.size(); i++) {
            var measured = dc.getTextWidthInPixels(lines[i], font);
            if (measured > width) { width = measured; }
        }
        return width;
    }

    function fitFont(dc, text, width, height, maximum) {
        var font = maximum;
        while (font > 0 && (dc.getTextWidthInPixels(text, font) > width || dc.getFontHeight(font) > height)) { font--; }
        return font;
    }

    // Measure every rich mode in both panels before drawing either panel.
    // A shared font prevents long rear-light labels from shrinking on their own.
    function includeMode(dc, data, width, height) {
        var pad = width >= 150 ? 10 : 6;
        var lines = data[4];
        var font = _modeTitleFont;
        var size = 18;
        while (true) {
            // Artwork fills about 5/6 of its cell. Match visible capital height,
            // excluding the font's descender space, and never use tiny status icons.
            var ascent = Graphics.getFontAscent(font);
            size = ascent >= 20 ? 28 : ascent > 16 ? 22 : 18;
            if (prominentModeIcons) {
                // Preserve the 540's prominent icon-to-text ratio on the 550.
                size = ascent * 1.5 > 28 ? 36 : 28;
                if (size == 36 && _modeIconsXL == null) {
                    _modeIconsXL = WatchUi.loadResource(Rez.Fonts.modeIconsXL);
                }
            }
            var available = width - pad * 2 - (data[3].equals("none") ? 0 : size + 5);
            if (font == 0 || (titleWidth(dc, lines, font) <= available && dc.getFontHeight(font) * lines.size() <= height * 0.3)) { break; }
            font--;
        }
        _modeTitleFont = font;
        _modeTitleIconSize = size;
        _modeTitleIconY = (Graphics.getFontAscent(font) - size) / 2;
    }

    // Only the configuration-switch arrows remain procedural.
    function drawIcon(dc, icon, x, y, size, background) {
        if (!icon.equals("cycle") && !icon.equals("cycle-flipped")) { return; }
        if (dc has :setAntiAlias) { dc.setAntiAlias(true); }
        var r = size / 2;
        var rx = icon.equals("cycle-flipped") ? -r : r;
        dc.setPenWidth(size >= 28 ? 3 : size >= 18 ? 2 : 1);
        dc.drawLine(x-rx,y,x-rx,y-r*0.6); dc.drawLine(x-rx,y-r*0.6,x+rx,y-r*0.6);
        dc.drawLine(x+rx,y-r*0.6,x+rx*0.4,y-r); dc.drawLine(x+rx,y-r*0.6,x+rx*0.4,y);
        dc.drawLine(x+rx,y,x+rx,y+r*0.6); dc.drawLine(x+rx,y+r*0.6,x-rx,y+r*0.6);
        dc.drawLine(x-rx,y+r*0.6,x-rx*0.4,y+r); dc.drawLine(x-rx,y+r*0.6,x-rx*0.4,y);
        dc.setPenWidth(1);
        if (dc has :setAntiAlias) { dc.setAntiAlias(false); }
    }

    // Each panel scales to its longest FULL-charge mode runtime. Only the
    // numerator decreases with battery; unknown readings have no fill.
    function runtimeFillWidth(minutes, maxMinutes, width) {
        if (minutes == null || minutes <= 0 || maxMinutes == null || maxMinutes <= 0) { return 0; }
        return Math.floor(width * (minutes >= maxMinutes ? 1.0 : minutes.toFloat() / maxMinutes)).toNumber();
    }

    function drawRuntimeFill(dc, data, status, x, y, width, height, radius, bg, maxHours) {
        if (AppTheme.hideFill) { return; }
        var fillWidth = runtimeFillWidth(remainingMinutes(data[2], status), maxHours * 60, width);
        if (fillWidth <= 0) { return; }
        dc.setClip(x, y, fillWidth, height);
        dc.setColor(bg == 0x000000 ? 0x333F4C : 0xDDE3EA, -1);
        dc.fillRoundedRectangle(x, y, width, height, radius);
        dc.clearClip();
    }

    function runtimeIconSize(font, width) {
        if (!matchRuntimeIconToText) { return width >= 150 ? 18 : 12; }
        // Keep the clock slightly smaller than the visible runtime text.
        var size = Graphics.getFontAscent(font) * 0.9;
        return size > 28 ? 36 : size > 22 ? 28 : size > 18 ? 22 : 18;
    }

    function modeLayout(dc, data, status, x, y, width, height) {
        // Store measurements in an array to stay within the Edge VM stack limit.
        var v = new [26];
        // Padding.
        v[0] = matchRuntimeIconToText ? 6 : width >= 150 ? 10 : 6;
        // Selection size.
        v[1] = width >= 150 ? 14 : 10;
        // Title icon size.
        v[2] = _modeTitleIconSize;
        // Has title icon.
        v[3] = !data[3].equals("none");
        // Title font.
        v[4] = _modeTitleFont;
        // Title text.
        v[5] = data[4].slice(0, null);
        for (var line = 0; line < v[5].size(); line++) {
            v[5][line] = StringHelper.trimTextByWidth(dc, v[5][line], v[4], width - v[0] * 2 - (v[3] ? v[2] + 5 : 0));
        }
        // Resolve optional rows before positioning: hidden or non-fitting rows
        // take no space, and the background fill never affects alignment.
        // Runtime icon size.
        v[6] = runtimeIconSize(v[4], width);
        // Title height.
        v[7] = dc.getFontHeight(v[4]) * v[5].size();
        // Brightness height.
        v[8] = dc.getFontHeight(0);
        // Lumens text.
        v[9] = data[1] == null ? "" : data[1].format("%g") + " lm";
        // Brightness step width.
        v[10] = (width - v[0] * 2 - dc.getTextWidthInPixels(v[9], 0) - 18) / 6;
        // Remaining minutes.
        v[11] = remainingMinutes(data[2], status);
        // Runtime text.
        v[12] = runtimeText(v[11]);
        // Runtime available width.
        v[13] = width-v[0]*2-v[6]-7-(matchRuntimeIconToText ? 0 : v[1]+4);
        // Minimum runtime height.
        v[14] = v[8] > v[6] ? v[8] : v[6];
        // Available detail height.
        v[15] = height - v[0] * 2 - v[7] - 3;
        // Show runtime.
        v[16] = data[1] != null && !AppTheme.hideRuntime &&
            v[15] >= v[14] && dc.getTextWidthInPixels(v[12], 0) <= v[13];
        // Show brightness.
        v[17] = data[1] != null && !AppTheme.hideLumens && v[10] >= 1 &&
            v[15] >= v[8] + (v[16] ? v[14] + 2 : 0);
        // Runtime font.
        v[18] = v[16] ? fitFont(dc, v[12], v[13],
            v[15] - (v[17] ? v[8] + 2 : 0), v[4]) : 0;
        v[6] = runtimeIconSize(v[18], width);
        // Runtime height.
        v[19] = v[16] ? dc.getFontHeight(v[18]) : 0;
        if (v[16] && v[19] < v[6]) { v[19] = v[6]; }
        // Content height.
        v[20] = v[7] + (v[17] || v[16] ? 3 : 0) +
            (v[17] ? v[8] : 0) + (v[17] && v[16] ? 2 : 0) + v[19];
        // Title y.
        v[21] = y + (height - v[20]) / 2;
        // Title x.
        v[22] = x + (width - titleWidth(dc, v[5], v[4]) - (v[3] ? v[2] + 5 : 0)) / 2;
        // Brightness y.
        v[23] = v[21] + v[7] + 3;
        // Runtime y.
        v[24] = v[23] + (v[17] ? v[8] + 2 : 0);
        // Runtime x.
        v[25] = x + (width - v[6] - 7 - dc.getTextWidthInPixels(v[12], v[18])) / 2;
        // [title, titleX, titleY, brightnessVisible, brightnessY, stepWidth,
        //  lumens, runtimeVisible, runtimeFont, runtimeY, runtimeX, runtime, minutes]
        return [v[5], v[22], v[21], v[17], v[23], v[10],
            v[9], v[16], v[18], v[24], v[25], v[12], v[11]];
    }

    function drawMode(dc, data, maxLumens, status, x, y, width, height, selected, fg, bg) {
        var pad = width >= 150 ? 10 : 6;
        // Bottom-right placement leaves the shared mode-title width unchanged.
        var selectionSize = width >= 150 ? 14 : 10;
        if (selected && !AppTheme.hideFill) {
            dc.setColor(bg == 0x000000 ? AppTheme.onDark : AppTheme.accent, -1);
            if (dc has :setAntiAlias) { dc.setAntiAlias(true); }
            dc.fillCircle(x+width-pad-selectionSize/2,
                y+height-pad-selectionSize/2, selectionSize/2);
            if (dc has :setAntiAlias) { dc.setAntiAlias(false); }
            dc.setPenWidth(1);
        }
        var layout = modeLayout(dc, data, status, x, y, width, height);
        var iconSize = _modeTitleIconSize;
        var hasIcon = !data[3].equals("none");
        dc.setColor(fg, -1);
        for (var line = 0; line < layout[0].size(); line++) {
            dc.drawText(layout[1]+(hasIcon?iconSize+5:0), layout[2]+line*dc.getFontHeight(_modeTitleFont), _modeTitleFont, layout[0][line], Graphics.TEXT_JUSTIFY_LEFT);
        }
        if (hasIcon) {
            // Draw directly: no extra icon/font wrapper frame on the Edge VM stack.
            dc.drawText(layout[1]+iconSize/2, layout[2]+_modeTitleIconY,
                iconSize == 36 ? _modeIconsXL : iconSize == 28 ? _modeIconsExtra : iconSize == 22 ? _modeIconsWide : _modeIconsLarge,
                data[3].equals("sun") ? "S" : data[3].equals("headlight-high") ? "H"
                : data[3].equals("headlight-medium") ? "h" : data[3].equals("headlight-low") ? "L"
                : data[3].equals("taillight-high") ? "T"
                : data[3].equals("taillight-medium") ? "t" : data[3].equals("taillight-low") ? "l" : data[3].equals("moon") ? "N" : "F",
                Graphics.TEXT_JUSTIFY_CENTER);
        }
        if (layout[3]) {
            var lit = brightnessSteps(data[1], maxLumens);
            for (var i=0; i<6; i++) {
                dc.setColor(i<lit ? (selected && AppTheme.hideFill ? fg : bg==0x000000?AppTheme.onDark:AppTheme.accent) : bg==0x000000?0x555555:0xBBBBBB, -1);
                dc.fillRectangle(x+pad+i*(layout[5]+2),layout[4]+dc.getFontHeight(0)/2-7/2,layout[5],7);
            }
            dc.setColor(fg,-1);
            dc.drawText(x+width-pad,layout[4],0,layout[6],Graphics.TEXT_JUSTIFY_RIGHT);
        }
        if (!layout[7]) { return; }
        iconSize = runtimeIconSize(layout[8], width);
        if (iconSize == 36 && _modeIconsXL == null) { _modeIconsXL = WatchUi.loadResource(Rez.Fonts.modeIconsXL); }
        var warning = layout[12] != null && layout[12] < 30;
        dc.setColor(warning ? (bg==0x000000 ? 0xFF6666 : RED) : fg,-1);
        // Align with visible text ascent, as for mode icons, excluding descender space.
        dc.drawText(layout[10]+iconSize/2, layout[9]+((matchRuntimeIconToText ? dc.getFontHeight(layout[8]) : Graphics.getFontAscent(layout[8]))-iconSize)/2,
            iconSize == 36 ? _modeIconsXL : iconSize == 28 ? _modeIconsExtra : iconSize == 22 ? _modeIconsWide
                : iconSize == 18 ? _modeIconsLarge : _modeIconsSmall, "C", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(layout[10]+iconSize+7,layout[9],layout[8],layout[11],Graphics.TEXT_JUSTIFY_LEFT);
    }
}
