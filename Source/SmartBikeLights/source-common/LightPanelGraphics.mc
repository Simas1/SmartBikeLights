using Toybox.Math;
using Toybox.Graphics;

// Kept out of non-touch builds. Metadata lives in the existing title field so
// old configurations and the configuration parser retain their wire format.
(:touchScreen)
module LightPanelGraphics {
    const BLUE = 0x056ABD;
    const WHITE = 0xFFFFFF;
    const RED = 0xCC2222;

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
        if (last.equals("@headlight") || last.equals("@taillight") || last.equals("@sun") || last.equals("@moon") || last.equals("@lightning") || last.equals("@none")) {
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

    function fitFont(dc, text, width, height, maximum) {
        var font = maximum;
        while (font > 0 && (dc.getTextWidthInPixels(text, font) > width || dc.getFontHeight(font) > height)) { font--; }
        return font;
    }

    // Mode and utility artwork use drawing primitives without custom fonts.
    function drawIcon(dc, icon, x, y, size, background) {
        if (dc has :setAntiAlias) { dc.setAntiAlias(true); }
        // Runtime is drawn on every mode button. Keep it resource-free so a
        // font-load failure cannot interrupt the rest of the panel's redraw.
        // Geometry matches assets/button-icons/time.svg (48-unit viewBox).
        if (icon.equals("clock")) {
            var scale = size / 48.0;
            dc.setPenWidth(size >= 18 ? 2 : 1);
            dc.drawCircle(x, y, 20 * scale);
            dc.drawLine(x, y - 11 * scale, x, y);
            dc.drawLine(x, y, x + 8 * scale, y + 6 * scale);
            dc.setPenWidth(1);
            if (dc has :setAntiAlias) { dc.setAntiAlias(false); }
            return;
        }
        // Flattened from the 48-unit SVG artwork. Avoid custom-font APIs here:
        // Edge 1040 overflows its VM stack inside their drawing wrappers.
        var points = null;
        if (icon.equals("headlight") || icon.equals("taillight")) {
            points = [[23, 7], [19.31, 7.94], [15.81, 9.23], [12.59, 10.88], [9.75, 12.88], [7.38, 15.19], [5.56, 17.83], [4.41, 20.77], [4.0, 24.0], [4.41, 27.23], [5.56, 30.17], [7.38, 32.81], [9.75, 35.12], [12.59, 37.12], [15.81, 38.77], [19.31, 40.06], [23.0, 41.0], [24.31, 37.08], [25.25, 32.88], [25.81, 28.48], [26.0, 24.0], [25.81, 19.52], [25.25, 15.12], [24.31, 10.92], [23.0, 7.0]];
        } else if (icon.equals("moon")) {
            points = [[25, 4], [20.94, 5.11], [17.08, 6.88], [13.52, 9.2], [10.38, 12.0], [7.74, 15.17], [5.73, 18.62], [4.45, 22.27], [4.0, 26.0], [4.36, 29.64], [5.41, 33.03], [7.06, 36.09], [9.25, 38.75], [11.91, 40.94], [14.97, 42.59], [18.36, 43.64], [22.0, 44.0], [25.65, 43.64], [29.09, 42.61], [32.3, 40.99], [35.25, 38.88], [37.92, 36.33], [40.28, 33.45], [42.32, 30.31], [44.0, 27.0], [41.29, 28.6], [38.45, 29.64], [35.54, 30.15], [32.62, 30.12], [29.75, 29.59], [26.98, 28.55], [24.38, 27.01], [22.0, 25.0], [20.04, 22.66], [18.67, 20.17], [17.94, 17.56], [17.88, 14.88], [18.51, 12.14], [19.89, 9.39], [22.04, 6.67], [25.0, 4.0]];
        } else if (icon.equals("lightning")) {
            points = [[28,4],[10,26],[22,26],[20,44],[38,20],[26,20],[28,4]];
        }
        if (points != null) {
            var unit = size / 48.0;
            var direction = icon.equals("headlight") ? -1 : 1;
            dc.setPenWidth(size >= 18 ? 2 : 1);
            if (icon.equals("moon") || icon.equals("lightning")) {
                for (var i = 0; i < points.size(); i++) {
                    points[i] = [x + (points[i][0]-24)*unit, y + (points[i][1]-24)*unit];
                }
                dc.fillPolygon(points);
                dc.setPenWidth(1);
                if (dc has :setAntiAlias) { dc.setAntiAlias(false); }
                return;
            }
            for (var i = 1; i < points.size(); i++) {
                dc.drawLine(x + direction * (points[i-1][0]-24) * unit, y + (points[i-1][1]-24) * unit,
                    x + direction * (points[i][0]-24) * unit, y + (points[i][1]-24) * unit);
            }
            if (icon.equals("headlight") || icon.equals("taillight")) {
                dc.drawLine(x+direction*8*unit,y-9*unit,x+direction*20*unit,y-9*unit);
                dc.drawLine(x+direction*9*unit,y,x+direction*20*unit,y);
                dc.drawLine(x+direction*8*unit,y+9*unit,x+direction*20*unit,y+9*unit);
            }
            dc.setPenWidth(1);
            if (dc has :setAntiAlias) { dc.setAntiAlias(false); }
            return;
        }
        var r = size / 2;
        dc.setPenWidth(size >= 28 ? 3 : size >= 18 ? 2 : 1);
        if (icon.equals("sun")) {
            dc.fillCircle(x,y,r/3);
            dc.drawLine(x-r*5/6,y,x-r*0.625,y); dc.drawLine(x+r*0.625,y,x+r*5/6,y);
            dc.drawLine(x,y-r*5/6,x,y-r*0.625); dc.drawLine(x,y+r*0.625,x,y+r*5/6);
            dc.drawLine(x-r*0.75,y-r*0.75,x-r*0.5,y-r*0.5);
            dc.drawLine(x+r*0.5,y+r*0.5,x+r*0.75,y+r*0.75);
            dc.drawLine(x+r*0.75,y-r*0.75,x+r*0.5,y-r*0.5);
            dc.drawLine(x-r*0.5,y+r*0.5,x-r*0.75,y+r*0.75);
        } else if (icon.equals("cycle")) {
            dc.drawLine(x-r,y,x-r,y-r*0.6); dc.drawLine(x-r,y-r*0.6,x+r,y-r*0.6);
            dc.drawLine(x+r,y-r*0.6,x+r*0.4,y-r); dc.drawLine(x+r,y-r*0.6,x+r*0.4,y);
            dc.drawLine(x+r,y,x+r,y+r*0.6); dc.drawLine(x+r,y+r*0.6,x-r,y+r*0.6);
            dc.drawLine(x-r,y+r*0.6,x-r*0.4,y+r); dc.drawLine(x-r,y+r*0.6,x-r*0.4,y);
        }
        dc.setPenWidth(1);
        if (dc has :setAntiAlias) { dc.setAntiAlias(false); }
    }

    function drawMode(dc, data, maxLumens, status, x, y, width, height, selected, fg, bg) {
        var pad = width >= 150 ? 10 : 6;
        var color = selected ? WHITE : fg;
        var iconSize = width >= 150 ? 22 : 18;
        var hasIcon = !data[3].equals("none");
        var nameWidth = width - pad * 2 - (hasIcon ? iconSize + 5 : 0);
        var titleFont = fitFont(dc, data[0], nameWidth, height * 0.3, 2);
        var name = StringHelper.trimTextByWidth(dc, data[0], titleFont, nameWidth);
        dc.setColor(color, -1);
        dc.drawText(x+pad+(hasIcon?iconSize+5:0), y+pad, titleFont, name, Graphics.TEXT_JUSTIFY_LEFT);
        if (hasIcon) { drawIcon(dc, data[3], x+pad+iconSize/2, y+pad+dc.getFontHeight(titleFont)/2, iconSize, bg); }
        // Keep runtime icons at their original size.
        iconSize = width >= 150 ? 18 : 12;
        if (data[1] == null || height < 65 || width < 80) { return; }
        var brightnessY = y + pad + dc.getFontHeight(titleFont) + 3;
        var lumens = data[1].format("%g") + " lm";
        var lumensFont = 0;
        var lumensWidth = dc.getTextWidthInPixels(lumens, lumensFont);
        var stepsWidth = width - pad * 2 - lumensWidth - 8;
        var stepWidth = (stepsWidth - 5 * 2) / 6;
        var lit = brightnessSteps(data[1], maxLumens);
        var stepHeight = 7;
        for (var i=0; i<6 && stepWidth>=1; i++) {
            dc.setColor(i<lit ? selected?WHITE:BLUE : selected?0x428CCA:bg==0x000000?0x444444:0xCCCCCC, -1);
            dc.fillRectangle(x+pad+i*(stepWidth+2),brightnessY+dc.getFontHeight(0)/2-stepHeight/2,stepWidth,stepHeight);
        }
        dc.setColor(color,-1);
        dc.drawText(x+width-pad,brightnessY,lumensFont,lumens,Graphics.TEXT_JUSTIFY_RIGHT);
        var minutes = remainingMinutes(data[2], status);
        var time = runtimeText(minutes);
        var timeY = brightnessY + dc.getFontHeight(0) + 2;
        var timeHeight = y+height-pad-timeY;
        var timeFont = fitFont(dc,time,width-pad*2-iconSize-7,timeHeight,titleFont);
        if (timeHeight < dc.getFontHeight(0)) { return; }
        var warning = minutes != null && minutes < 30;
        if (warning && selected) {
            dc.setColor(0xFFF0F0,-1);
            dc.fillRoundedRectangle(x+pad-2,timeY,width-pad*2+4,dc.getFontHeight(timeFont),3);
        }
        dc.setColor(warning ? (!selected && bg==0x000000 ? 0xFF6666 : RED) : color,-1);
        drawIcon(dc,"clock",x+pad+iconSize/2,timeY+dc.getFontHeight(timeFont)/2,iconSize,bg);
        dc.drawText(x+pad+iconSize+7,timeY,timeFont,time,Graphics.TEXT_JUSTIFY_LEFT);
    }
}
