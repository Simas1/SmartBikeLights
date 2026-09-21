using Toybox.Test;

(:test)
class NetworkModeFixture {
    var mode = 0;
    function getNetworkMode() { return mode; }
}

(:test)
class NetworkModeView extends BikeLightsView {
    var network;
    var changes = [];
    var refreshCount = 0;
    function initialize() {
        network = new NetworkModeFixture();
        _lightNetwork = network;
    }
    function poll() { refreshNetworkMode(); }
    function drawAt(timer) { refreshNetworkAfterHiddenPage(timer); }
    function onShow() { refreshCount++; }
    protected function initializeLights(mode) {
        changes.add(mode);
        _initializedLights = 2;
    }
}

(:test)
function networkModeChangesWithoutReconnectTest(logger) {
    var view = new NetworkModeView();
    view.poll();
    Test.assert(view.changes.size() == 1);
    Test.assert(view.changes[0] == null);
    view.network.mode = 1; // Individual -> Auto, without a formed callback.
    view.poll();
    Test.assert(view.changes[1] == 1);
    view.poll(); // Unchanged polls must not reset Manual/Smart controls.
    Test.assert(view.changes.size() == 2);
    view.network.mode = 3;
    view.poll();
    Test.assert(view.changes[2] == 3);
    view.network.mode = 0;
    view.poll();
    Test.assert(view.changes[3] == 0);
    return true;
}

(:test)
function networkRefreshAfterHiddenPageTest(logger) {
    var view = new NetworkModeView();
    view.drawAt(1000);
    view.drawAt(2000);
    Test.assert(view.refreshCount == 0);
    view.drawAt(10000); // Return without an onShow callback.
    Test.assert(view.refreshCount == 1);
    view.drawAt(11000);
    Test.assert(view.refreshCount == 1);
    return true;
}
