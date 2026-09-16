using Toybox.Test;

(:test)
class WakeRecoveryView extends BikeLightsView {
    var savedModes = [null, null, null];
    var restoredModes = [null, null, null];
    var refreshCount = 0;

    // Isolate lifecycle recovery from real ANT lights and application storage.
    function initialize() {
    }

    function tick(timer) {
        restoreControlAfterSleep(timer);
    }

    protected function getLightProperty(id, lightType, defaultValue) {
        Test.assert(id.equals("PCM"));
        var value = savedModes[lightType];
        savedModes[lightType] = null;
        return value;
    }

    protected function setLightProperty(id, lightType, value) {
        Test.assert(id.equals("CM"));
        restoredModes[lightType] = value;
    }

    function onShow() {
        refreshCount++;
    }
}

(:test)
function hiddenPageWakeRecoveryTest(logger) {
    var view = new WakeRecoveryView();
    view.tick(0);
    view.savedModes[0] = 0; // Headlight was Smart before sleep.
    view.savedModes[2] = 0; // Taillight was Smart before sleep.
    // No drawing or page navigation occurs while the device sleeps/wakes.
    view.tick(10000);
    Test.assert(view.restoredModes[0] == 0);
    Test.assert(view.restoredModes[2] == 0);
    Test.assert(view.refreshCount == 1);
    view.tick(11000);
    Test.assert(view.refreshCount == 1);
    return true;
}

(:test)
function hiddenPageNormalUpdatesTest(logger) {
    var view = new WakeRecoveryView();
    view.savedModes[0] = 0;
    // A late first calculation is startup, not a resume.
    view.tick(10000);
    view.tick(11000);
    view.tick(13000);
    Test.assert(view.refreshCount == 0);
    Test.assert(view.restoredModes[0] == null);
    Test.assert(view.savedModes[0] == 0);
    return true;
}

(:test)
function wakePreservesOtherControlModesTest(logger) {
    var view = new WakeRecoveryView();
    view.tick(1000);
    view.savedModes[0] = 2; // Restore Manual, without forcing Smart.
    view.savedModes[2] = 1; // Restore Network, without forcing Smart.
    view.tick(10000);
    Test.assert(view.restoredModes[0] == 2);
    Test.assert(view.restoredModes[2] == 1);
    // Saved modes are consumed; a later resume must not restore stale values.
    view.restoredModes[0] = null;
    view.restoredModes[2] = null;
    view.tick(20000);
    Test.assert(view.restoredModes[0] == null);
    Test.assert(view.restoredModes[2] == null);
    return true;
}
