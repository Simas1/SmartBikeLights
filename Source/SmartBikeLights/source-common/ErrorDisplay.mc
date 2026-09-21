using Toybox.Graphics;

// Low-memory devices retain the original code-only error display.
(:highMemory)
module ErrorDisplay {
    // Component, short explanation, additional detail, recovery suggestion.
    function describe(code) {
        switch (code) {
            case 1: return ["Light network", "Unsupported light type", "Only headlights and taillights are supported.", "Remove the unsupported light from Garmin Sensors."];
            case 2: return ["Light network", "Duplicate light type", "More than one light of the same type is connected.", "Keep one headlight and one taillight paired."];
            case 3: return ["Light settings", "Unsupported mode", "A panel or filter uses a mode this light does not support.", "Choose a supported mode in the indicated panel or filter."];
            case 4: return ["Configuration", "Cannot load settings", "Configuration setup failed. The exact setting is unknown.", "Review or replace the active configuration in app settings."];
            case 5: return ["Light network", "No free ANT channel", "An individual light channel could not be allocated.", "Disable unused sensors in Garmin Sensors, then reload the data field."];
            case 6: return ["Light network", "Cannot open ANT channel", "An individual light channel could not be opened.", "Remove or disable these lights in Garmin Sensors, then reload the data field."];
            case 7: return ["Light settings", "Wrong light type", "The device does not support its configured light type.", "Check the device number and headlight or taillight type in app settings."];
            case 8: return ["Remote controller", "Cannot open ANT channel", "A remote controller channel could not be opened.", "Disable unused sensors in Garmin Sensors, then reload the data field."];
            case 9: return ["Remote controller", "No free ANT channel", "A remote controller channel could not be allocated.", "Disable unused sensors in Garmin Sensors, then reload the data field."];
            case 10: return ["Radar", "Radar is not paired", "Connect Radar is enabled, but no paired radar was found.", "In Garmin Sensors, use Search All and pair SBL RD <device number>."];
            case 11: return ["Radar", "Cannot open ANT channel", "The radar channel could not be opened.", "Disable unused sensors in Garmin Sensors, then reload the data field."];
            case 12: return ["Radar", "No free ANT channel", "The radar channel could not be allocated.", "Disable unused sensors in Garmin Sensors, then reload the data field."];
        }
        return null;
    }

    // Return null rather than clipping a word that cannot fit.
    function wrap(dc, text, width) {
        var lines = [];
        while (text.length() > 0) {
            if (dc.getTextWidthInPixels(text, 0) <= width) {
                lines.add(text);
                break;
            }
            var end = text.length() - 1;
            while (end > 0 && (!text.substring(end, end + 1).equals(" ") || dc.getTextWidthInPixels(text.substring(0, end), 0) > width)) {
                end--;
            }
            if (end == 0) { return null; }
            lines.add(text.substring(0, end));
            text = text.substring(end + 1, text.length());
        }
        return lines;
    }

    // Layout completely before drawing so fallback never leaves partial text.
    function draw(dc, code, context, fullScreen, width, height, centerX, centerY) {
        var info = describe(code);
        if (info == null) { return false; }
        if (context != null && context[0] == code) {
            info[0] = context[1];
            info[2] = context[2];
        }
        var heading = "Error " + code + " - " + info[0];
        var lineHeight = dc.getFontHeight(0) + 3;
        var maxWidth = width - 16;
        var lines = wrap(dc, heading, maxWidth);
        var summary = wrap(dc, info[1], maxWidth);
        if (lines == null || summary == null) { return false; }
        lines.addAll(summary);
        if (fullScreen) {
            var details = wrap(dc, info[2], maxWidth);
            var fix = wrap(dc, "Fix: " + info[3], maxWidth);
            if (details == null || fix == null) { return false; }
            lines.add("");
            lines.addAll(details);
            lines.add("");
            lines.addAll(fix);
        }
        var totalHeight = lines.size() * lineHeight;
        if (totalHeight > height - 16) { return false; }
        var y = centerY - totalHeight / 2;
        for (var i = 0; i < lines.size(); i++) {
            dc.drawText(centerX, y, 0, lines[i], Graphics.TEXT_JUSTIFY_CENTER);
            y += lineHeight;
        }
        return true;
    }
}
