using Toybox.Test;
using Toybox.System;
using Toybox.Time;
using Toybox.Time.Gregorian;

(:test)
class TestBikeLightsView extends BikeLightsView {

    var configuration;

    (:lowMemory)
    function initialize(configuration) {
        self.configuration = configuration;
        BikeLightsView.initialize();
        onSettingsChanged();
    }

    (:highMemory)
    function initialize(configuration) {
        self.configuration = configuration;
        BikeLightsView.initialize();
        onSettingsChanged(false);
    }

    protected function getPropertyValue(key) {
        if (key.equals("CC")) { return 1; } // Never use a saved simulator profile.
        return key.equals("LC") ? configuration : BikeLightsView.getPropertyValue(key);
    }

    function getSunriseSunset(rise, time, position) {
        return getSunriseSet(rise, time, position);
    }

    // Do not initialize virtual lights
    function setupLightSensors() {
    }

    function requestMode(lightData, mode, title, force) {
        setLightMode(lightData, mode, title, force);
    }

    (:touchScreen)
    function tapModes(type, supported) { return configuredTapModes(type, supported); }

    function showsFooter() { return _showFooter; }

    function getErrorCode() {
        return _errorCode;
    }
}

(:test)
function sunsetSunriseTest(logger) {
    var view = new TestBikeLightsView(null);

    var time = Gregorian.utcInfo(new Time.Moment(1740783600), 0 /* FORMAT_SHORT */);
    var position = [48.574789, 10.3710937];
    var sunriseTime = view.getSunriseSunset(true, time, position);
    var sunsetTime = view.getSunriseSunset(false, time, position);

    Test.assert(sunriseTime == 21741);
    Test.assert(sunsetTime == 61186);

    return true;
}

(:test :touchScreen :noWatchPanel)
function parseFreshTouchConfiguration(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.taillightData[15] == null); // Serial number is optional.
    Test.assert(view.remoteControllers.size() == 0);
    Test.assert(!view.requiresBikeRadarConnection());
    return true;
}

(:test :touchScreen :noWatchPanel)
function parseFreshTouchRemoteAndRadar(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#1#B3843##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.remoteControllers.size() == 1);
    Test.assert(view.requiresBikeRadarConnection());
    return true;
}

(:test :touchScreen :noWatchPanel)
function rejectShortenedTouchConfigurations(logger) {
    var values = [
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416:::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1|:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#1:123:456#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1|2,:-1,Off:0|1,Solid:4|1,Day Flash:7|1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0"
    ];
    for (var i = 0; i < values.size(); i++) {
        var view = new TestBikeLightsView("SBL1#" + values[i]);
        Test.assertMessage(view.getErrorCode() == 4, "Accepted shortened format at index " + i);
    }
    return true;
}

(:test :settings)
function parseFreshSettingsConfiguration(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.taillightData[15] == null); // Serial number is optional.
    Test.assert(view.remoteControllers.size() == 0);
    Test.assert(!view.requiresBikeRadarConnection());
    return true;
}

(:test :settings)
function parseFreshSettingsRemoteAndRadar(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#1#B4315##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.remoteControllers.size() == 1);
    Test.assert(view.requiresBikeRadarConnection());
    return true;
}

(:test :settings)
function rejectShortenedSettingsConfigurations(logger) {
    var values = [
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0#1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416:::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1|:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#1:123:456#0:0#123!:123!#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3:Varia 510!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0#0##1#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##4:Varia 510|Off:0|Solid:4|Day Flash:7|Night Flash:6#0::#0:0#123!:123!#0##1#B4315##2#0#0"
    ];
    for (var i = 0; i < values.size(); i++) {
        var view = new TestBikeLightsView("SBL1#" + values[i]);
        Test.assertMessage(view.getErrorCode() == 4, "Accepted shortened format at index " + i);
    }
    return true;
}

(:test :touchScreen :noWatchPanel)
function configuredTouchLightsUseSectionPresence(logger) {
    var sections = ["", "::"];
    for (var h = 0; h < 2; h++) {
        for (var t = 0; t < 2; t++) {
            // Check native and individual networks with empty optional light values.
            for (var network = 0; network < 2; network++) {
                var value = "SBL1##" + sections[h] + "##" + sections[t] + "####" + network + "::#0:0#123!:123!#0##1#B3843#" + (h == 1 ? "14" : "") + "#" + (t == 1 ? "1" : "") + "#0#0";
                var view = new TestBikeLightsView(value);
                Test.assert(view.getErrorCode() == null);
                Test.assert(view.headlightData[16] == (h == 1));
                Test.assert(view.taillightData[16] == (t == 1));
                Test.assert(view.headlightData[15] == null);
                Test.assert(view.taillightData[15] == null);
                Test.assert(view.usesIndividualNetwork() == (network == 1));
            }
        }
    }
    var oldColor = new TestBikeLightsView("SBL1##0,1::1:######0::#0:0#123!:123!#0##1#B3843#14##0#0");
    Test.assert(oldColor.getErrorCode() == 4);
    return true;
}

(:test :settings)
function configuredSettingsLightsUseSectionPresence(logger) {
    var sections = ["", "::"];
    for (var h = 0; h < 2; h++) {
        for (var t = 0; t < 2; t++) {
            // Check native and individual networks with empty optional light values.
            for (var network = 0; network < 2; network++) {
                var value = "SBL1##" + sections[h] + "##" + sections[t] + "####" + network + "::#0:0#123!:123!#0##1#B4315#" + (h == 1 ? "14" : "") + "#" + (t == 1 ? "1" : "") + "#0#0";
                var view = new TestBikeLightsView(value);
                Test.assert(view.getErrorCode() == null);
                Test.assert(view.headlightData[16] == (h == 1));
                Test.assert(view.taillightData[16] == (t == 1));
                Test.assert(view.headlightData[15] == null);
                Test.assert(view.taillightData[15] == null);
                Test.assert(view.usesIndividualNetwork() == (network == 1));
            }
        }
    }
    var oldColor = new TestBikeLightsView("SBL1##0,1::1:######0::#0:0#123!:123!#0##1#B4315#14##0#0");
    Test.assert(oldColor.getErrorCode() == 4);
    return true;
}

(:test)
function rejectHistoricalConfigurations(logger) {
    var values = [
        "1,1|NIGHT:1Es1800,r0###0,73404416#2,2|BREAK:1:7A<-30|:1:6D=1##5,4:Varia 510|2,:-1,Off:0|1,Steady Beam:4|1,Day Flash:7|1,Night Flash:6#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#2,2!BREAK:1:7:1A[-30!:1:6:1D=1##5,4:Varia 510!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#B2713##2#0#0",
        "   1,1!NIGHT:1Es1800,r0###0,73404416::1#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#B2713##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:32142:0!2|1:1::123!:123!!|2:1:10:,1=:!H]0#B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:1D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#B3121##2#0#0",
        "   1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0#B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0#B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B3121##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#1|1:MicroRemote!1|1:32142:0!2|1:1::123!:123!!|2:1:10:,1=:!H]0#B3121##2#0#0",
        "#4587520,196641#2,2!TEST:1:1:0:0H]0!:1:0:0:0D=1#6291461,1409482753####B3289#1#1#0#0",
        "#4587520,196641::1#2,2!TEST:1:1:0:0H]0!:1:0:0:0D=1#6291461,1409482753::1##0#B3289#1#1#0#0",
        "#4587520,196641::1:#2,2!TEST:1:1:0:0H]0!:1:0:0:0D=1#6291461,1409482753::1:##0#B3289#1#1#0#0",
        "1,1NIGHT:1Es1800,r0###0,73404416#2,2!BREAK:1:7:1A[-30!:1:6:1D=1##5,4:Varia 510!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#B2713##2#0#0",
        "11!NIGHT:1Es1800,r0###0,73404416#2,2!BREAK:1:7:1A[-30!:1:6:1D=1##5,4:Varia 510!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#B2713##2#0#0",
        "NIGHT:1Es1800,r0###0,73404416#2,2!BREAK:1:7:1A[-30!:1:6:1D=1##5,4:Varia 510!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#B2713##2#0#0",
        "!:1Es1800,r0###0,73404416#2,2!BREAK:1:7:1A[-30!:1:6:1D=1##5,4:Varia 510!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#B2713##2#0#0",
        "1,1NIGHT:1Es1800,r0###0,73404416#2,2BREAK:1:7:1A[-30:1:6:1D=1##5,4:Varia 5102,:-1,Off:01,Steady Beam:41,Day Flash:71,Night Flash:6#0::#0:0#B2713##2#0#0",
        "#4587520,196641"
    ];
    for (var i = 0; i < values.size(); i++) {
        var view = new TestBikeLightsView(values[i]);
        Test.assertMessage(view.getErrorCode() == 4, "Accepted historical format at index " + i);
    }
    return true;
}

(:test)
class ModeCommandRecorder {
    var type = 0; // Headlight, as on the real BikeLight API.
    var modes;
    function initialize() {
        modes = [];
    }
    function setMode(mode) {
        modes.add(mode);
    }
}

(:test)
function newestLightModeRequestWins(logger) {
    var view = new TestBikeLightsView(null);
    var light = new ModeCommandRecorder();
    var data = [light, null, 1, null, 2, null, null, null, null, 0];
    view.requestMode(data, 2, "First", false);
    // Returning to the reported mode must cancel the in-flight target.
    view.requestMode(data, 1, "Latest", false);
    Test.assert(light.modes.size() == 2);
    Test.assert(light.modes[1] == 1);
    Test.assert(data[7] == 1);
    Test.assert(data[8].equals("Latest"));
    Test.assert(data[2] == 1); // Actual state is kept separate from selection.
    return true;
}

(:test)
function pendingLightModeDoesNotRestartConfirmation(logger) {
    var view = new TestBikeLightsView(null);
    var light = new ModeCommandRecorder();
    var data = [light, null, 1, null, 0, null, null, null, null, 0];
    view.requestMode(data, 2, "First", false);
    data[9] = 2;
    view.requestMode(data, 2, "Updated", false);
    Test.assert(light.modes.size() == 1);
    Test.assert(data[9] == 2);
    Test.assert(data[8].equals("Updated"));
    view.requestMode(data, 2, null, true);
    Test.assert(light.modes.size() == 2);
    Test.assert(data[9] == 4);
    return true;
}

(:test :touchScreen)
class PanelControlCycleTestView extends TestBikeLightsView {
    var requested = null;

    function initialize(value) {
        TestBikeLightsView.initialize(value);
    }

    function setLightAndControlMode(data, type, mode, control) {
        requested = [mode, control];
    }

    function press(data, mode) {
        requested = null;
        onLightPanelModeChange(data, 0, mode, data[4]);
    }
}

(:test :touchScreen)
function panelControlCyclesSelectedModes(logger) {
    var selections = ["123", "23", "13", "3", "321"];
    var expectedWithFilters = [[1, 2, 0], [1, 2, 1], [2, 0, 0], [2, 2, 2], [2, 0, 1]];
    var expectedWithoutFilters = [[1, 2, 1], [1, 2, 1], [2, 2, 2], [2, 2, 2], [2, 2, 1]];
    for (var selection = 0; selection < selections.size(); selection++) {
        var config = "SBL1##::######0::#0:0#" + selections[selection] + "!:3!#0##1#B3843#14##0#0";
        var view = new PanelControlCycleTestView(config);
        Test.assert(view.getErrorCode() == null);
        for (var filters = 0; filters < 2; filters++) {
            var data = new [19];
            data[2] = 5;
            data[7] = 7; // A pending brightness request must survive entering Manual.
            data[18] = filters == 1 ? [1] : null;
            for (var current = 0; current < 3; current++) {
                data[4] = current;
                var expected = filters == 1 ? expectedWithFilters[selection][current] : expectedWithoutFilters[selection][current];
                view.press(data, -1);
                if (expected == current) {
                    Test.assert(view.requested == null);
                } else {
                    Test.assertMessage(view.requested[1] == expected, "selection=" + selection + " filters=" + filters + " current=" + current + " expected=" + expected + " actual=" + view.requested[1]);
                    Test.assert(view.requested[0] == 7);
                }
                // A light-mode button always enters Manual, including Off.
                view.press(data, 0);
                Test.assert(view.requested[0] == 0);
                Test.assert(view.requested[1] == (current == 2 ? null : 2));
            }
        }
    }
    var invalid = new PanelControlCycleTestView("SBL1##::######0::#0:0#12!:3!#0##1#B3843#14##0#0");
    Test.assert(invalid.getErrorCode() == 4);
    return true;
}

(:test :touchScreen :noWatchPanel)
function fixedPanelButtonsAreNotSerialized(logger) {
    var panels = ["0,0:Front:0:16777215:-1", "1,1:Front:0:16777215:-1!1,Control:-1", "1,1:Front:0:16777215:-1!1,Off:0", "1,1:Front:0:16777215:-1!1,Config:-2", "1,1:Front:0:16777215:-1!1,Battery:-3"];
    for (var i = 0; i < panels.size(); i++) {
        var view = new TestBikeLightsView("SBL1##::####" + panels[i] + "##0::#0:0#3!:3!#0##1#B3843#14##0#0");
        Test.assert(i == 0 ? view.getErrorCode() == null : view.getErrorCode() != null);
    }
    return true;
}

(:test :settings)
function fixedMenuButtonsAreNotSerialized(logger) {
    var panels = ["0:Front", "1:Front!Control:-1", "1:Front!Off:0", "1:Front!Config:-2", "1:Front!Battery:-3"];
    for (var i = 0; i < panels.size(); i++) {
        var view = new TestBikeLightsView("SBL1##::####" + panels[i] + "##0::#0:0#3!:3!#0##1#B4315#14##0#0");
        Test.assert(i == 0 ? view.getErrorCode() == null : view.getErrorCode() != null);
        if (i == 0) {
            Test.assert(view.headlightSettings.size() == 3);
            Test.assert(view.headlightSettings[1].equals("Off") && view.headlightSettings[2] == 0);
        }
    }
    return true;
}


(:test :highMemory)
function footerVisibilityConfiguration(logger) {
    var flags = ["1", "0", "2", ""];
    for (var i = 0; i < flags.size(); i++) {
        var view = new TestBikeLightsView("SBL1##::######0::#0:0#3!:3!#0##" + flags[i] + "#B3843#14##0#0");
        Test.assert(i < 2 ? view.getErrorCode() == null : view.getErrorCode() != null);
        if (i < 2) { Test.assert(view.showsFooter() == (i == 0)); }
    }
    var defaults = new TestBikeLightsView(null);
    Test.assert(defaults.showsFooter());
    return true;
}


(:test :touchScreen :noWatchPanel)
function fieldCyclesFilteredLayoutModes(logger) {
    var config = "SBL1##::#1,1!:1:52:0:0D=1###3,2:Front:0:16777215:-1!2,Low:51,Medium:52!1,High:53##0::#0:0#123!53,51:123!#0##1#B3843#14##0#0";
    var view = new TestBikeLightsView(config);
    Test.assert(view.getErrorCode() == null);
    var modes = view.tapModes(0, [0, 51, 52, 53]);
    Test.assert(modes.size() == 2 && modes[0] == 51 && modes[1] == 53);
    Test.assert(view.headlightPanelSettings[0] == 3); // Keep hidden-mode metadata for the active card.
    Test.assert(view.headlightData[18] != null); // Automation remains configured.
    return true;
}
