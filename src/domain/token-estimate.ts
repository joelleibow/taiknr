/**
 * The one rule that turns text into a token estimate: pi's own characters ÷ 4, rounded up
 * (design D7). Raw text, a stub and recall's block all go through this, so both sides of the
 * calibration ratio come from one estimator.
 */
export function tokenEstimate(text: string): number {
	return Math.ceil(text.length / 4);
}
