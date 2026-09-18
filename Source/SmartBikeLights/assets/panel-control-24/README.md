# Edge 1040 panel icon trial

These four SVGs are authored on a 24 x 24 pixel grid and rendered directly,
without resizing or alpha thresholding, into PanelControl24.png. The existing
bitmap-font mapping and metrics stay unchanged: M manual, N network, S smart,
P power. Smooth coverage is flattened to grayscale on black in the exported
font atlas, rather than encoded only in PNG alpha. This is a font coverage mask,
not a black background to display on the button. Network
nodes use integer-aligned edges and rounded corners; the hand and power use
two-pixel strokes. Smart uses four symmetrical cubic curves instead of straight
polygon shoulders. The palm is curved, and the power ring is inset to balance
the visual weight and margins of the set.

Run `node scripts/generate-control-mode-fonts.cjs --panel-only` with sharp
available to regenerate just this atlas. The normal full generation also uses
these sources for PanelControl24. Other font sizes retain their existing artwork
and generation; small-button fallback icons are therefore unchanged.

This resource is shared by other medium-resolution touchscreen devices, not
exclusive to Edge 1040. Check the real device in day/night and selected/unselected
states: a desktop PNG preview does not verify Garmin's final color quantization.

The initial transparent-white atlas appeared solid at the edges on the user's
1040. The grayscale export is the follow-up device test; its on-device smoothing
is not yet verified.
