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
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.taillightData[15] == null); // Serial number is optional.
    Test.assert(view.remoteControllers.size() == 0);
    Test.assert(!view.requiresBikeRadarConnection());
    return true;
}

(:test :touchScreen :noWatchPanel)
function parseFreshTouchRemoteAndRadar(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#B3843##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.remoteControllers.size() == 1);
    Test.assert(view.requiresBikeRadarConnection());
    return true;
}

(:test :touchScreen :noWatchPanel)
function rejectShortenedTouchConfigurations(logger) {
    var values = [
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416:::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1|:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#1:123:456#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1|2,:-1,Off:0|1,Solid:4|1,Day Flash:7|1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0"
    ];
    for (var i = 0; i < values.size(); i++) {
        var view = new TestBikeLightsView("SBL1#" + values[i]);
        Test.assertMessage(view.getErrorCode() == 4, "Accepted shortened format at index " + i);
    }
    return true;
}

(:test :settings)
function parseFreshSettingsConfiguration(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.taillightData[15] == null); // Serial number is optional.
    Test.assert(view.remoteControllers.size() == 0);
    Test.assert(!view.requiresBikeRadarConnection());
    return true;
}

(:test :settings)
function parseFreshSettingsRemoteAndRadar(logger) {
    var view = new TestBikeLightsView("SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#B4315##2#0#0");
    Test.assert(view.getErrorCode() == null);
    Test.assert(view.remoteControllers.size() == 1);
    Test.assert(view.requiresBikeRadarConnection());
    return true;
}

(:test :settings)
function rejectShortenedSettingsConfigurations(logger) {
    var values = [
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0#B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416:::#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1|:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#1:123:456#0:0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6#0::#0:0#0#0##B4315##2#0#0",
        "1,1!NIGHT:1Es1800,r0###0,73404416::1:#1,1!:1:6:0:0D=1##4:Varia 510|Off:0|Solid:4|Day Flash:7|Night Flash:6#0::#0:0#0##B4315##2#0#0"
    ];
    for (var i = 0; i < values.size(); i++) {
        var view = new TestBikeLightsView("SBL1#" + values[i]);
        Test.assertMessage(view.getErrorCode() == 4, "Accepted shortened format at index " + i);
    }
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
