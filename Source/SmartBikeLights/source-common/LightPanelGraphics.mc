using Toybox.Math;
using Toybox.Graphics;
using Toybox.WatchUi;

// Kept out of non-touch builds. Metadata lives in the existing title field so
// old configurations and the configuration parser retain their wire format.
(:touchScreen)
module LightPanelGraphics {
    const WHITE = 0xFFFFFF;
    const RED = 0xCC2222;
    var _modeIconsSmall;
    var _modeIconsLarge;
    var _modeIconsWide;
    var _modeIconsExtra;
    var _modeTitleFont = 2;
    var _modeTitleIconSize = 18;
    var _modeTitleIconY = 0;

    // Load during panel setup, never inside the nested button drawing path.
    function initializeFonts() {
        _modeTitleFont = 2;
        if (_modeIconsSmall == null) {
            _modeIconsSmall = WatchUi.loadResource(Rez.Fonts.modeIconsSmall);
            _modeIconsLarge = WatchUi.loadResource(Rez.Fonts.modeIconsLarge);
            _modeIconsWide = WatchUi.loadResource(Rez.Fonts.modeIconsWide);
            _modeIconsExtra = WatchUi.loadResource(Rez.Fonts.modeIconsExtra);
        }
    }

    // [display name, lumens, full-charge hours, explicit icon]
    function parseTitle(title) {
        if (title == null) { return null; }
        var lines = [];
        var index = title.find("\\n");
        while (index != null) {
            lines.add(title.substring(0, index));
            title = title.substring(index + 2, title.length());
            index = title.find("\\n");
        }
        lines.add(title);
        var icon = "none";
        var last = lines[lines.size() - 1];
        if (last.equals("@headlight-high") || last.equals("@headlight-medium") || last.equals("@headlight-low") || last.equals("@taillight-high") || last.equals("@taillight-medium") || last.equals("@taillight-low") || last.equals("@headlight") || last.equals("@taillight") || last.equals("@sun") || last.equals("@moon") || last.equals("@lightning") || last.equals("@none")) {
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
        for (var i = 1; i < lines.size(); i++) { name += " " + lines[i]; }
        return [name, lumens, hours, icon];
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

    // Move configuration switching out of the mode grid. Leave configured Off,
    // control and battery buttons in place, including mixed button groups.
    function panelSettings(settings) {
        var result = settings.slice(0, 6);
        result[0] = 0;
        result[1] = 0;
        var index = 6;
        for (var i = 0; i < settings[1]; i++) {
            var count = settings[index];
            var group = [0];
            for (var j = 0; j < count; j++) {
                var k = index + 1 + j * 2;
                if (settings[k] != -2) {
                    group[0]++;
                    group.add(settings[k]);
                    group.add(settings[k + 1]);
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

    function groupWeight(settings, index) {
        for (var i = 0; i < settings[index]; i++) {
            var mode = settings[index + 1 + i * 2];
            if (mode != -1 && mode != 0) { return 1.0; }
        }
        return 0.5;
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

    function fitFont(dc, text, width, height, maximum) {
        var font = maximum;
        while (font > 0 && (dc.getTextWidthInPixels(text, font) > width || dc.getFontHeight(font) > height)) { font--; }
        return font;
    }

    // Measure every rich mode in both panels before drawing either panel.
    // A shared font prevents long rear-light labels from shrinking on their own.
    function includeMode(dc, data, width, height) {
        var pad = width >= 150 ? 10 : 6;
        var font = _modeTitleFont;
        var size = 18;
        while (true) {
            // Artwork fills about 5/6 of its cell. Match visible capital height,
            // excluding the font's descender space, and never use tiny status icons.
            var ascent = Graphics.getFontAscent(font);
            size = ascent >= 20 ? 28 : ascent > 16 ? 22 : 18;
            var available = width - pad * 2 - (data[3].equals("none") ? 0 : size + 5);
            if (font == 0 || (dc.getTextWidthInPixels(data[0], font) <= available && dc.getFontHeight(font) <= height * 0.3)) { break; }
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
        var iconSize = _modeTitleIconSize;
        var hasIcon = !data[3].equals("none");
        var titleFont = _modeTitleFont;
        var name = StringHelper.trimTextByWidth(dc, data[0], titleFont, width - pad * 2 - (hasIcon ? iconSize + 5 : 0));
        dc.setColor(fg, -1);
        dc.drawText(x+pad+(hasIcon?iconSize+5:0), y+pad, titleFont, name, Graphics.TEXT_JUSTIFY_LEFT);
        if (hasIcon) {
            // Draw directly: no extra icon/font wrapper frame on the Edge VM stack.
            dc.drawText(x+pad+iconSize/2, y+pad+_modeTitleIconY,
                iconSize == 28 ? _modeIconsExtra : iconSize == 22 ? _modeIconsWide : _modeIconsLarge,
                data[3].equals("sun") ? "S" : (data[3].equals("headlight") || data[3].equals("headlight-high")) ? "H"
                : data[3].equals("headlight-medium") ? "h" : data[3].equals("headlight-low") ? "L"
                : (data[3].equals("taillight") || data[3].equals("taillight-high")) ? "T"
                : data[3].equals("taillight-medium") ? "t" : data[3].equals("taillight-low") ? "l" : data[3].equals("moon") ? "N" : "F",
                Graphics.TEXT_JUSTIFY_CENTER);
        }
        // Keep runtime icons at their original size.
        iconSize = width >= 150 ? 18 : 12;
        if (data[1] == null) { return; }
        var brightnessY = y + pad + dc.getFontHeight(titleFont) + 3;
        var lumens = data[1].format("%g") + " lm";
        var stepWidth = (width - pad * 2 - dc.getTextWidthInPixels(lumens, 0) - 18) / 6;
        var minutes = remainingMinutes(data[2], status);
        var time = runtimeText(minutes);
        var timeWidth = width-pad*2-iconSize-7-selectionSize-4;
        var minimumTimeHeight = dc.getFontHeight(0);
        if (minimumTimeHeight < iconSize) { minimumTimeHeight = iconSize; }
        // Keep the title, then runtime. Brightness is the first row to drop.
        var timeY = brightnessY;
        if (!AppTheme.hideLumens && stepWidth >= 1 &&
            (AppTheme.hideRuntime ? y+height-pad-brightnessY >= dc.getFontHeight(0) :
            y+height-pad-(brightnessY+dc.getFontHeight(0)+2) >= minimumTimeHeight &&
            dc.getTextWidthInPixels(time, 0) <= timeWidth)) {
            var lit = brightnessSteps(data[1], maxLumens);
            for (var i=0; i<6; i++) {
                dc.setColor(i<lit ? (selected && AppTheme.hideFill ? fg : bg==0x000000?AppTheme.onDark:AppTheme.accent) : bg==0x000000?0x555555:0xBBBBBB, -1);
                dc.fillRectangle(x+pad+i*(stepWidth+2),brightnessY+dc.getFontHeight(0)/2-7/2,stepWidth,7);
            }
            dc.setColor(fg,-1);
            dc.drawText(x+width-pad,brightnessY,0,lumens,Graphics.TEXT_JUSTIFY_RIGHT);
            timeY += dc.getFontHeight(0) + 2;
        }
        if (AppTheme.hideRuntime) { return; }
        var timeHeight = y+height-pad-timeY;
        if (timeHeight < minimumTimeHeight || dc.getTextWidthInPixels(time, 0) > timeWidth) { return; }
        var timeFont = fitFont(dc,time,timeWidth,timeHeight,titleFont);
        var warning = minutes != null && minutes < 30;
        dc.setColor(warning ? (bg==0x000000 ? 0xFF6666 : RED) : fg,-1);
        // Align with visible text ascent, as for mode icons, excluding descender space.
        dc.drawText(x+pad+iconSize/2, timeY+(Graphics.getFontAscent(timeFont)-iconSize)/2,
            width >= 150 ? _modeIconsLarge : _modeIconsSmall, "C", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(x+pad+iconSize+7,timeY,timeFont,time,Graphics.TEXT_JUSTIFY_LEFT);
    }
}
