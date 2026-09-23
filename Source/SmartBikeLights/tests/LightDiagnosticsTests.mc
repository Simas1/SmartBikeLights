using Toybox.Test;

(:test)
function diagnosticCommandResultsTest(logger) {
    LightDiagnostics.commands = [null, null];
    LightDiagnostics.sent(0, 51, 1000);
    LightDiagnostics.reported(0, 52, 1100);
    Test.assert(LightDiagnostics.commands[0][3].equals("Waiting"));
    LightDiagnostics.retried(0);
    LightDiagnostics.reported(0, 51, 2240);
    Test.assert(LightDiagnostics.commands[0][2] == 1);
    Test.assert(LightDiagnostics.commands[0][4] == 1240);
    LightDiagnostics.reported(0, 51, 3000);
    Test.assert(LightDiagnostics.commands[0][4] == 1240);
    LightDiagnostics.sent(0, 53, 4000);
    LightDiagnostics.reported(0, 51, 4100);
    Test.assert(LightDiagnostics.commands[0][3].equals("Waiting"));
    Test.assert(LightDiagnostics.commands[0][2] == 0);
    LightDiagnostics.finish(0, "Timeout", 8000);
    LightDiagnostics.reported(0, 53, 9000);
    Test.assert(LightDiagnostics.commands[0][3].equals("Timeout"));
    LightDiagnostics.sent(2, 8, 10000);
    LightDiagnostics.reported(2, -1, 10100);
    Test.assert(LightDiagnostics.commands[1][3].equals("Disconnected"));
    Test.assert(LightDiagnostics.commands[0][3].equals("Timeout"));
    LightDiagnostics.commands = [null, null];
    return true;
}

(:test)
function diagnosticNetworkTransitionsTest(logger) {
    LightDiagnostics.networkState = 0;
    LightDiagnostics.lost = 0;
    LightDiagnostics.restored = 0;
    LightDiagnostics.awaitingRecovery = false;
    LightDiagnostics.stateChanged(1);
    LightDiagnostics.stateChanged(2);
    LightDiagnostics.stateChanged(2);
    Test.assert(LightDiagnostics.restored == 0);
    LightDiagnostics.stateChanged(0);
    LightDiagnostics.stateChanged(0);
    LightDiagnostics.stateChanged(1);
    Test.assert(LightDiagnostics.lost == 1);
    LightDiagnostics.stateChanged(2);
    LightDiagnostics.stateChanged(2);
    Test.assert(LightDiagnostics.restored == 1);
    LightDiagnostics.networkState = 0;
    LightDiagnostics.lost = 0;
    LightDiagnostics.restored = 0;
    LightDiagnostics.awaitingRecovery = false;
    return true;
}

(:test)
function diagnosticPagingTest(logger) {
    LightDiagnostics.page = 0;
    LightDiagnostics.pageTime = null;
    LightDiagnostics.advancePage(3, true, 100);
    LightDiagnostics.advancePage(3, true, 3099);
    Test.assert(LightDiagnostics.page == 0);
    LightDiagnostics.advancePage(3, true, 3100);
    Test.assert(LightDiagnostics.page == 1);
    LightDiagnostics.advancePage(3, false, 10000);
    Test.assert(LightDiagnostics.page == 1);
    LightDiagnostics.advancePage(1, true, 10000);
    Test.assert(LightDiagnostics.page == 0);
    LightDiagnostics.advancePage(0, true, 11000);
    Test.assert(LightDiagnostics.pageTime == null);
    return true;
}

(:test)
class DiagnosticTestLight {
    var identifier = 123;
    var type = 0;
    function getCapableModes() { return [0, 51, 55]; }
}
(:test)
class DiagnosticTestNetwork {
    var light;
    function initialize() { light = new DiagnosticTestLight(); }
    function getBikeLights() { return [light]; }
}
(:test)
class DiagnosticTestController {
    var calls = 0;
    var target = null;
    function diagnosticControl(type, action, mode) { calls++; target = mode; }
}
(:test)
function diagnosticSelectThenSendTest(logger) {
    var network = new DiagnosticTestNetwork();
    var controller = new DiagnosticTestController();
    LightDiagnostics.page = 0;
    LightDiagnostics.displayedLight = network.light;
    LightDiagnostics.selectedMode = 51;
    LightDiagnostics.buttons = [[0,0,40,40,3], [50,0,40,40,4]];
    LightDiagnostics.tap([10,10], network, controller);
    Test.assert(LightDiagnostics.selectedMode == 55);
    Test.assert(controller.calls == 0);
    LightDiagnostics.tap([60,10], network, controller);
    Test.assert(controller.calls == 1);
    Test.assert(controller.target == 55);
    network.light.identifier = 456;
    LightDiagnostics.displayedLight = new DiagnosticTestLight();
    LightDiagnostics.tap([60,10], network, controller);
    Test.assert(controller.calls == 1);
    LightDiagnostics.buttons = [];
    LightDiagnostics.displayedLight = null;
    LightDiagnostics.selectedMode = null;
    return true;
}

(:test)
class DiagnosticModeRecorder extends ModeCommandRecorder {
    function initialize() { ModeCommandRecorder.initialize(); }
    function getCapableModes() { return [0, 1, 2]; }
}

(:test)
function diagnosticExplicitResendTest(logger) {
    var view = new TestBikeLightsView(null);
    var light = new DiagnosticModeRecorder();
    var data = view.headlightData;
    data[0] = light;
    data[2] = 1;
    data[4] = 2;
    data[7] = null;
    view.diagnosticControl(0, 4, 1);
    Test.assert(light.modes.size() == 1);
    view.diagnosticControl(0, 4, 1);
    Test.assert(light.modes.size() == 2);
    view.diagnosticControl(0, 4, 99);
    Test.assert(light.modes.size() == 2);
    return true;
}
