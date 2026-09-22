using Toybox.Application.Properties;

(:highMemory)
module AppTheme {
    var textOnly = false;
    var hideLumens = false;
    var hideRuntime = false;
    var hideFill = false;
    var accent = 0x056ABD;
    var onDark = 0x55BBFF;
    var muted = 0x428CCA;

    // Older installations have no theme preference and start with Blue.
    function load() {
        var theme = Properties.getValue("TH");
        textOnly = Properties.getValue("TO") == true;
        hideLumens = Properties.getValue("ShowBrightness") != true;
        hideRuntime = Properties.getValue("ShowRuntime") != true;
        hideFill = Properties.getValue("ShowRuntimeFill") != true;
        accent = theme == 1 ? 0x7744BB : theme == 2 ? 0x008866 : 0x056ABD;
        onDark = theme == 1 ? 0xBB99FF : theme == 2 ? 0x66DDBB : 0x55BBFF;
        muted = theme == 1 ? 0x9966CC : theme == 2 ? 0x44AA88 : 0x428CCA;
    }
}
