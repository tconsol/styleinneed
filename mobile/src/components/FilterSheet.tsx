import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView,
  PanResponder, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAttributes } from '../api/catalog';
import { colors, fonts, radii, spacing } from '../theme';
import type { Attribute } from '../types';

const PRICE_MAX = 100_000;
const PRICE_STEP = 500;
const THUMB = 24;

// ── Public types & helpers ────────────────────────────────────────────────────

export interface FilterState {
  priceMin: number;
  priceMax: number;
  attrs: Record<string, string[]>;
}

export const emptyFilters: FilterState = { priceMin: 0, priceMax: PRICE_MAX, attrs: {} };

export const activeFilterCount = (f: FilterState): number =>
  (f.priceMin > 0 || f.priceMax < PRICE_MAX ? 1 : 0) +
  Object.values(f.attrs).reduce((s, v) => s + v.length, 0);

export const filtersToQuery = (f: FilterState): Record<string, string | number> => {
  const q: Record<string, string | number> = {};
  if (f.priceMin > 0) q.minPrice = f.priceMin;
  if (f.priceMax < PRICE_MAX) q.maxPrice = f.priceMax;
  for (const [slug, vals] of Object.entries(f.attrs)) {
    if (vals.length) q[slug] = vals.join(',');
  }
  return q;
};

// ── Price Range Slider ────────────────────────────────────────────────────────
// Uses gesture dx (not pageX) so no pageX/measure needed — works reliably in Modals.

function PriceSlider({
  minVal, maxVal, onChange,
}: {
  minVal: number; maxVal: number;
  onChange: (min: number, max: number) => void;
}) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const minRef = useRef(minVal);
  const maxRef = useRef(maxVal);
  const onChangeRef = useRef(onChange);
  minRef.current = minVal;
  maxRef.current = maxVal;
  onChangeRef.current = onChange;

  const snap = (v: number) =>
    Math.round(Math.max(0, Math.min(v, PRICE_MAX)) / PRICE_STEP) * PRICE_STEP;
  const toX = (v: number) => (v / PRICE_MAX) * trackWidthRef.current;
  const toVal = (x: number) => snap((x / (trackWidthRef.current || 1)) * PRICE_MAX);

  const minStartX = useRef(0);
  const maxStartX = useRef(0);

  const minPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { minStartX.current = toX(minRef.current); },
      onPanResponderMove: (_, gs) => {
        const tw = trackWidthRef.current;
        if (!tw) return;
        const maxX = toX(maxRef.current) - (PRICE_STEP / PRICE_MAX) * tw;
        const x = Math.max(0, Math.min(minStartX.current + gs.dx, maxX));
        onChangeRef.current(toVal(x), maxRef.current);
      },
      onPanResponderRelease: (_, gs) => {
        const tw = trackWidthRef.current;
        if (!tw) return;
        const maxX = toX(maxRef.current) - (PRICE_STEP / PRICE_MAX) * tw;
        const x = Math.max(0, Math.min(minStartX.current + gs.dx, maxX));
        onChangeRef.current(toVal(x), maxRef.current);
      },
    })
  ).current;

  const maxPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { maxStartX.current = toX(maxRef.current); },
      onPanResponderMove: (_, gs) => {
        const tw = trackWidthRef.current;
        if (!tw) return;
        const minX = toX(minRef.current) + (PRICE_STEP / PRICE_MAX) * tw;
        const x = Math.max(minX, Math.min(maxStartX.current + gs.dx, tw));
        onChangeRef.current(minRef.current, toVal(x));
      },
      onPanResponderRelease: (_, gs) => {
        const tw = trackWidthRef.current;
        if (!tw) return;
        const minX = toX(minRef.current) + (PRICE_STEP / PRICE_MAX) * tw;
        const x = Math.max(minX, Math.min(maxStartX.current + gs.dx, tw));
        onChangeRef.current(minRef.current, toVal(x));
      },
    })
  ).current;

  const minX = trackWidth ? toX(minVal) : 0;
  const maxX = trackWidth ? toX(maxVal) : trackWidth;
  const fmt = (v: number) => v === PRICE_MAX ? '₹1,00,000+' : `₹${v.toLocaleString('en-IN')}`;

  return (
    <View style={ps.wrap}>
      {/* Min / Max price chips */}
      <View style={ps.priceRow}>
        <View style={ps.priceBox}>
          <Text style={ps.priceHint}>MIN</Text>
          <Text style={ps.priceVal}>{fmt(minVal)}</Text>
        </View>
        <View style={ps.priceDash} />
        <View style={[ps.priceBox, { alignItems: 'flex-end' }]}>
          <Text style={ps.priceHint}>MAX</Text>
          <Text style={ps.priceVal}>{fmt(maxVal)}</Text>
        </View>
      </View>

      {/* Track */}
      <View
        style={ps.track}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthRef.current = w;
          setTrackWidth(w);
        }}
      >
        {/* Background rail */}
        <View style={ps.rail} />
        {/* Active fill */}
        {trackWidth > 0 && (
          <View style={[ps.fill, { left: minX, width: maxX - minX }]} />
        )}
        {/* Min thumb */}
        {trackWidth > 0 && (
          <View
            style={[ps.thumb, { left: minX - THUMB / 2 }]}
            {...minPan.panHandlers}
          >
            <View style={ps.thumbCenter} />
          </View>
        )}
        {/* Max thumb */}
        {trackWidth > 0 && (
          <View
            style={[ps.thumb, { left: maxX - THUMB / 2 }]}
            {...maxPan.panHandlers}
          >
            <View style={ps.thumbCenter} />
          </View>
        )}
      </View>

      {/* Scale */}
      <View style={ps.scale}>
        {[0, 25000, 50000, 75000, 100000].map((v) => (
          <Text key={v} style={ps.scaleTick}>
            {v === 0 ? '₹0' : v === 100000 ? '₹1L' : `₹${v / 1000}k`}
          </Text>
        ))}
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: { paddingTop: spacing.md },
  priceRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.xl + 4,
  },
  priceBox: { flex: 1, gap: 2 },
  priceHint: {
    fontFamily: fonts.body, fontSize: 10,
    color: colors.muted, letterSpacing: 1,
  },
  priceVal: {
    fontFamily: fonts.headingBold, fontSize: 16,
    color: colors.text,
  },
  priceDash: {
    width: 24, height: 2, borderRadius: 1,
    backgroundColor: colors.border, marginHorizontal: 8,
  },
  track: {
    height: THUMB, justifyContent: 'center',
    position: 'relative', marginHorizontal: THUMB / 2,
  },
  rail: {
    position: 'absolute', left: 0, right: 0,
    height: 4, borderRadius: 2,
    backgroundColor: colors.border,
  },
  fill: {
    position: 'absolute', height: 4,
    borderRadius: 2, backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute', width: THUMB, height: THUMB,
    borderRadius: THUMB / 2, backgroundColor: colors.white,
    borderWidth: 2.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  thumbCenter: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },
  scale: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.md, paddingHorizontal: 0,
  },
  scaleTick: {
    fontFamily: fonts.body, fontSize: 10,
    color: colors.muted,
  },
});

// ── Option renderers ──────────────────────────────────────────────────────────

function ChipGrid({
  options, selected, onToggle,
}: {
  options: { label: string; value: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={og.grid}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <Pressable
            key={o.value}
            style={[og.chip, active && og.chipActive]}
            onPress={() => onToggle(o.value)}
          >
            <Text style={[og.chipText, active && og.chipTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const og = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radii.full, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEF6ED',
  },
  chipText: {
    fontFamily: fonts.bodyMedium, fontSize: 13,
    color: colors.muted,
  },
  chipTextActive: {
    fontFamily: fonts.bodySemibold,
    color: colors.text,
  },
});

function ColorGrid({
  options, selected, onToggle,
}: {
  options: { label: string; value: string; hex?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={cg.grid}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <Pressable
            key={o.value}
            style={cg.item}
            onPress={() => onToggle(o.value)}
          >
            <View style={[cg.ring, active && cg.ringActive]}>
              <View
                style={[
                  cg.circle,
                  { backgroundColor: o.hex ?? '#ccc' },
                ]}
              >
                {active && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </View>
            <Text style={[cg.label, active && cg.labelActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const cg = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  item: { alignItems: 'center', width: 52, gap: 5 },
  ring: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  ringActive: { borderColor: colors.primary },
  circle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.body, fontSize: 10,
    color: colors.muted, textAlign: 'center',
  },
  labelActive: { fontFamily: fonts.bodySemibold, color: colors.text },
});

// ── FilterSheet ───────────────────────────────────────────────────────────────

export default function FilterSheet({
  visible, productType, value, onApply, onClose,
}: {
  visible: boolean;
  productType?: string;
  value: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: attributes } = useAttributes(productType);
  const [local, setLocal] = useState<FilterState>(value);
  const [group, setGroup] = useState(0);

  useEffect(() => {
    if (visible) { setLocal(value); setGroup(0); }
  }, [visible]);

  const groups = useMemo(
    () => ['Price', ...(attributes ?? []).map((a) => a.name)],
    [attributes]
  );
  const activeAttr: Attribute | undefined =
    group > 0 ? attributes?.[group - 1] : undefined;

  const toggleAttr = (slug: string, val: string) =>
    setLocal((p) => {
      const cur = p.attrs[slug] ?? [];
      const next = cur.includes(val)
        ? cur.filter((x) => x !== val)
        : [...cur, val];
      return { ...p, attrs: { ...p.attrs, [slug]: next } };
    });

  const groupCount = (i: number): number => {
    if (i === 0) return (local.priceMin > 0 || local.priceMax < PRICE_MAX) ? 1 : 0;
    const a = attributes?.[i - 1];
    return a ? (local.attrs[a.slug]?.length ?? 0) : 0;
  };

  const totalActive = activeFilterCount(local);
  const RAIL_W = Math.floor(width * 0.38);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />

        <View style={s.sheet}>
          {/* Drag handle */}
          <View style={s.handle} />

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>Filter</Text>
              {totalActive > 0 && (
                <View style={s.countPill}>
                  <Text style={s.countText}>{totalActive}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => setLocal(emptyFilters)} style={s.clearBtn}>
              <Text style={s.clearText}>Clear all</Text>
            </Pressable>
          </View>

          {/* ── Two-pane body ── */}
          <View style={s.body}>

            {/* Left rail — 38% */}
            <View style={[s.rail, { width: RAIL_W }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {groups.map((g, i) => {
                  const active = i === group;
                  const n = groupCount(i);
                  return (
                    <Pressable
                      key={g}
                      style={[s.railItem, active && s.railItemActive]}
                      onPress={() => setGroup(i)}
                    >
                      {active && <View style={s.railBar} />}
                      <Text
                        style={[s.railLabel, active && s.railLabelActive]}
                        numberOfLines={2}
                      >
                        {g}
                      </Text>
                      {n > 0 && (
                        <View style={s.railDot}>
                          <Text style={s.railDotText}>{n}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Divider */}
            <View style={s.divider} />

            {/* Right options — 62% */}
            <ScrollView
              style={s.options}
              contentContainerStyle={s.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {group === 0 ? (
                <>
                  <Text style={s.optTitle}>Price Range</Text>
                  <PriceSlider
                    minVal={local.priceMin}
                    maxVal={local.priceMax}
                    onChange={(mn, mx) =>
                      setLocal((p) => ({ ...p, priceMin: mn, priceMax: mx }))
                    }
                  />
                </>
              ) : activeAttr ? (
                <>
                  <Text style={s.optTitle}>{activeAttr.name}</Text>
                  {activeAttr.inputType === 'color' ? (
                    <ColorGrid
                      options={activeAttr.options}
                      selected={local.attrs[activeAttr.slug] ?? []}
                      onToggle={(v) => toggleAttr(activeAttr.slug, v)}
                    />
                  ) : (
                    <ChipGrid
                      options={activeAttr.options}
                      selected={local.attrs[activeAttr.slug] ?? []}
                      onToggle={(v) => toggleAttr(activeAttr.slug, v)}
                    />
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>

          {/* ── Footer ── */}
          <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable style={s.resetBtn} onPress={onClose}>
              <Text style={s.resetText}>Close</Text>
            </Pressable>
            <Pressable
              style={s.applyBtn}
              onPress={() => { onApply(local); onClose(); }}
            >
              <Text style={s.applyText}>
                {totalActive > 0 ? `Apply (${totalActive})` : 'Apply'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ACCENT = colors.primary;       // '#C8A97E' gold
const DARK   = colors.text;          // '#1C1C1E'
const BG     = '#FAFAFA';

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  sheet: {
    height: '72%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 2,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: fonts.headingBold, fontSize: 18,
    color: DARK,
  },
  countPill: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: '#fff' },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },

  // Two-pane
  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  // Left rail
  rail: { backgroundColor: BG },
  railItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingRight: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    position: 'relative',
    paddingLeft: 16,
  },
  railItemActive: { backgroundColor: '#fff' },
  railBar: {
    position: 'absolute', left: 0, top: 10, bottom: 10,
    width: 3, borderRadius: 2,
    backgroundColor: ACCENT,
  },
  railLabel: {
    fontFamily: fonts.body, fontSize: 12,
    color: '#888', flex: 1, lineHeight: 17,
  },
  railLabelActive: {
    fontFamily: fonts.bodySemibold, color: DARK,
  },
  railDot: {
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  railDotText: { fontFamily: fonts.bodySemibold, fontSize: 10, color: '#fff' },

  divider: { width: 1, backgroundColor: '#F0F0F0' },

  // Right options
  options: { flex: 1 },
  optionsContent: {
    padding: 18, paddingBottom: 28,
  },
  optTitle: {
    fontFamily: fonts.bodySemibold, fontSize: 11,
    color: colors.muted, letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Footer
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  resetBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  resetText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.muted },
  applyBtn: {
    flex: 2, paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: DARK,
    alignItems: 'center',
  },
  applyText: {
    fontFamily: fonts.bodySemibold, fontSize: 14,
    color: '#fff', letterSpacing: 0.3,
  },
});
