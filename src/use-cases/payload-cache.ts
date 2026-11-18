/**
 * The three facts the payload edit needs and hands on, declared pi-free so the domain, the
 * publisher and both handlers share one shape (design §5.2).
 */

/** Where the last committed request's carrier sat: its message index, the block before recall's block, and recall's block. */
export interface CarrierRecord {
	index: number;
	fingerprint: string;
	block: string;
}

/** What the finished payload does with recall's block: an entry read through, and the block's own charge. */
export interface AppliedPlacement {
	carrierRead: string | null;
	block: "cached" | "uncached" | null;
}

/** The per-session cell the payload handler, the commit handler, recall's handler and the registrar share. */
export interface PayloadCacheState {
	/** Cell (a): the exact block text this request carries, cleared at every `context_with_system`. */
	recallBlock: string | null;
	/** Record (b), the committed one. */
	carrier: CarrierRecord | null;
	/** The next record the last payload call computed. */
	nextCarrier: CarrierRecord | null;
	applied: AppliedPlacement | null;
}
