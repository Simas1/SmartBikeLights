using Toybox.Test;

(:test, :touchScreen)
function graphicsLegacyTitleTest(logger) {
    var data = LightPanelGraphics.parseTitle("Low \\n 200lm-12h");
    Test.assert(data[1] == 200);
    Test.assert(data[2] == 12);
    Test.assert(data[3].equals("none"));
    data = LightPanelGraphics.parseTitle("Custom name\\n5lm-13.5h\\n@lightning");
    Test.assert(data[1] == 5);
    Test.assert(data[2] == 13.5);
    Test.assert(data[3].equals("lightning"));
    var icons = ["headlight", "taillight", "moon", "lightning", "headlight-high", "headlight-medium", "headlight-low", "taillight-high", "taillight-medium", "taillight-low"];
    for (var i = 0; i < icons.size(); i++) {
        var named = LightPanelGraphics.parseTitle("Custom mode\\n@" + icons[i]);
        Test.assert(named[0].equals("Custom mode"));
        Test.assert(named[1] == null);
        Test.assert(named[3].equals(icons[i]));
    }
    Test.assert(LightPanelGraphics.parseTitle("Night Flash") == null);
    Test.assert(LightPanelGraphics.parseTitle("Low\\n200lm-badh") == null);
    Test.assert(LightPanelGraphics.parseTitle("Low\\n200lm-0h") == null);
    Test.assert(LightPanelGraphics.parseTitle("Low\\n200lm-12hjunk") == null);
    return true;
}

(:test, :touchScreen)
function graphicsBrightnessAndRuntimeTest(logger) {
    Test.assert(LightPanelGraphics.brightnessSteps(200,1200) == 1);
    Test.assert(LightPanelGraphics.brightnessSteps(600,1200) == 3);
    Test.assert(LightPanelGraphics.brightnessSteps(1200,1200) == 6);
    Test.assert(LightPanelGraphics.brightnessSteps(5,45) == 1);
    Test.assert(LightPanelGraphics.brightnessSteps(45,45) == 6);
    Test.assert(LightPanelGraphics.remainingMinutes(2,4) == 30); // Not red.
    Test.assert(LightPanelGraphics.remainingMinutes(2,5) == 6); // Red.
    Test.assert(LightPanelGraphics.remainingMinutes(12,2) == 540);
    Test.assert(LightPanelGraphics.remainingMinutes(12,6) == null);
    Test.assert(LightPanelGraphics.remainingMinutes(12,7) == null);
    Test.assert(LightPanelGraphics.remainingMinutes(12,8) == null);
    Test.assert(LightPanelGraphics.runtimeText(144).equals("~2h24"));
    Test.assert(LightPanelGraphics.runtimeText(0.5).equals("~<1m"));
    Test.assert(LightPanelGraphics.runtimeText(null).equals("--"));
    // Full-charge maxima stay fixed: AT1600 12h, Flare RT 15h.
    Test.assert(LightPanelGraphics.runtimeFillWidth(LightPanelGraphics.remainingMinutes(12, 4), 720, 120) == 30);
    Test.assert(LightPanelGraphics.runtimeFillWidth(60, 720, 120) == 10);
    Test.assert(LightPanelGraphics.runtimeFillWidth(30, 720, 120) == 5);
    Test.assert(LightPanelGraphics.runtimeFillWidth(LightPanelGraphics.remainingMinutes(15, 2), 900, 120) == 90);
    Test.assert(LightPanelGraphics.runtimeFillWidth(540, 900, 120) == 72);
    Test.assert(LightPanelGraphics.runtimeFillWidth(720, 720, 120) == 120);
    Test.assert(LightPanelGraphics.runtimeFillWidth(1000, 900, 120) == 120);
    Test.assert(LightPanelGraphics.runtimeFillWidth(null, 180, 120) == 0);
    Test.assert(LightPanelGraphics.runtimeFillWidth(30, null, 120) == 0);
    Test.assert(LightPanelGraphics.runtimeFillWidth(30, 0, 120) == 0);
    Test.assert(LightPanelGraphics.runtimeFillWidth(0, 180, 120) == 0);
    return true;
}

(:test, :touchScreen)
function graphicsOptionalButtonsTest(logger) {
    var original = [4,3,"Front",0,0,-1,2,-1,null,0,"Off",1,51,"Low",1,-2,null];
    var result = LightPanelGraphics.panelSettings(original);
    Test.assert(original[0] == 4); // Never mutate the saved configuration.
    Test.assert(result[0] == 3 && result[1] == 2);
    Test.assert(result[6] == 2 && result[7] == -1 && result[9] == 0);
    result = LightPanelGraphics.panelSettings([1,1,"Front",0,0,-1,1,-2,null]);
    Test.assert(result[0] == 0 && result[1] == 0);
    result = LightPanelGraphics.panelSettings([2,1,"Front",0,0,-1,2,-2,null,51,"Low"]);
    Test.assert(result[0] == 1 && result[1] == 1 && result[6] == 1 && result[7] == 51);
    result = LightPanelGraphics.panelSettings([1,1,"Front",0,0,2,1,51,"Low"]);
    Test.assert(result[5] == 2); // Preserve the configured automation-name font.
    return true;
}
