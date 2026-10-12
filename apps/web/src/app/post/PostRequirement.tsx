'use client';

import type { RequirementType } from '@setu/domain';
import { createRequirementSchema, otpSendSchema, type CreateRequirementInput } from '@setu/schemas';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LocateFixed,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLenis } from 'lenis/react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type Category } from '@/lib/api';
import { FLOWS, SECTORS } from '@/lib/content';

type Step = 0 | 1 | 2 | 3;
const STEP_TITLES = ['What do you need?', 'Where is the work?', 'Verify your phone', 'Posted'];

const input =
  'w-full rounded-xl border border-border bg-surface px-4 py-3 text-text outline-none transition placeholder:text-text-muted/70 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15';
const labelCls = 'mb-1.5 block text-sm font-semibold text-navy-600';

const RENOVATION_SCOPE = [
  'Kitchen',
  'Bathroom',
  'Flooring',
  'Painting',
  'False ceiling',
  'Electrical',
  'Full house',
  'Exterior',
];
const UNITS = [
  'bag',
  'kg',
  'tonne',
  'cft',
  'cum',
  'sqft',
  'piece',
  'litre',
  'metre',
  'truck',
] as const;

interface MaterialRow {
  name: string;
  quantity: string;
  unit: (typeof UNITS)[number];
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-orange-400 bg-orange-50 text-orange-600'
          : 'border-border text-text-muted hover:border-navy-300'
      }`}
    >
      {children}
    </button>
  );
}

export function PostRequirement() {
  const params = useSearchParams();
  const initialType = (FLOWS.find((f) => f.type === params.get('type'))?.type ??
    'service') as RequirementType;

  const [step, setStep] = useState<Step>(0);
  const [type, setType] = useState<RequirementType>(initialType);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'asap' | 'today' | 'this_week' | 'flexible'>('this_week');
  const [propertyType, setPropertyType] = useState<
    'apartment' | 'independent_house' | 'villa' | 'commercial' | 'plot'
  >('apartment');
  const [scope, setScope] = useState<string[]>([]);
  const [areaSqft, setAreaSqft] = useState('');
  const [materials, setMaterials] = useState<MaterialRow[]>([
    { name: '', quantity: '', unit: 'bag' },
  ]);
  const [equipmentType, setEquipmentType] = useState('');
  const [durationDays, setDurationDays] = useState('3');
  const [withOperator, setWithOperator] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [topic, setTopic] = useState<
    'structural' | 'architecture' | 'interior' | 'vastu' | 'cost_estimate' | 'other'
  >('structural');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [sector, setSector] = useState<string>(SECTORS[0].slug);
  const [line1, setLine1] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<{ id: string; title: string } | null>(null);

  const lenis = useLenis();
  useEffect(() => {
    // Each step starts at the top of the page.
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    api
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const typeCategories = categories.filter((c) => c.requirementType === type);
  const sectorData = SECTORS.find((s) => s.slug === sector)!;

  const payload = useMemo(() => {
    const rupees = (v: string) => (v ? Math.round(Number(v) * 100) : undefined);
    const detailsByType = {
      service: { description, urgency },
      renovation: {
        propertyType,
        scope,
        areaSqft: areaSqft ? Number(areaSqft) : undefined,
        description,
        wantsSiteVisit: true,
      },
      material_rfq: {
        items: materials
          .filter((m) => m.name.trim())
          .map((m) => ({ name: m.name.trim(), quantity: Number(m.quantity), unit: m.unit })),
      },
      equipment: {
        equipmentType,
        durationDays: Number(durationDays),
        withOperator,
        startDate,
        quantity: 1,
      },
      consult: { topic, description, mode: 'site_visit' },
    } as const;
    return {
      type,
      title,
      categoryId: categoryId || undefined,
      budgetMinPaise: rupees(budgetMin),
      budgetMaxPaise: rupees(budgetMax),
      address: {
        line1,
        sector: sectorData.name,
        city: 'Greater Noida',
        pincode: sectorData.pincode,
        location: gps ?? { lat: sectorData.lat, lng: sectorData.lng },
      },
      details: detailsByType[type],
    };
  }, [
    type,
    title,
    categoryId,
    budgetMin,
    budgetMax,
    line1,
    sectorData,
    gps,
    description,
    urgency,
    propertyType,
    scope,
    areaSqft,
    materials,
    equipmentType,
    durationDays,
    withOperator,
    startDate,
    topic,
  ]);

  /** Validates only the fields owned by the current step, using the shared API schema. */
  function validate(forStep: Step): string | null {
    const res = createRequirementSchema.safeParse(payload);
    if (res.success) return null;
    const relevant = res.error.issues.filter((i) => {
      const isAddress = i.path[0] === 'address';
      return forStep === 0 ? !isAddress : isAddress;
    });
    return relevant[0]?.message ?? null;
  }

  function next() {
    const err = validate(step);
    setError(err);
    if (!err) setStep((s) => (s + 1) as Step);
  }

  function locate() {
    if (!navigator.geolocation) return setError('Location is not available on this device');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Pick your sector instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function sendOtp() {
    const parsed = otpSendSchema.safeParse({ phone });
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    setBusy(true);
    setError(null);
    try {
      const res = await api.sendOtp(phone);
      setOtpSent(true);
      setResendIn(res.resendAfterSeconds);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndPost() {
    setBusy(true);
    setError(null);
    try {
      const { accessToken } = await api.verifyOtp(phone, code);
      const req = await api.createRequirement(accessToken, payload as CreateRequirementInput);
      setPosted({ id: req.id, title: req.title });
      setStep(3);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {step < 3 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-orange-600">Step {step + 1} of 3</span>
            <span className="text-text-muted">Free · No obligation</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
            <motion.div
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              className="h-full bg-orange-400"
            />
          </div>
          <h1 className="mt-6 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight text-navy-600">
            {STEP_TITLES[step]}
          </h1>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[28px] border border-border bg-surface p-6 sm:p-8"
          // Any edit clears a stale validation message.
          onChange={() => error && setError(null)}
        >
          {step === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {FLOWS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setType(f.type);
                      setCategoryId('');
                    }}
                    className={`rounded-2xl border p-3 text-left transition ${
                      type === f.type
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-border hover:border-navy-300'
                    }`}
                  >
                    <span
                      className={`block text-sm font-bold ${type === f.type ? 'text-orange-600' : 'text-navy-600'}`}
                    >
                      {f.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-text-muted">{f.hindi}</span>
                  </button>
                ))}
              </div>

              {typeCategories.length > 0 && (
                <Field label="Category">
                  <select
                    className={input}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Not sure / other</option>
                    {typeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn} · {c.nameHi}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Short title">
                <input
                  className={input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kitchen tap leaking"
                  maxLength={120}
                />
              </Field>

              {(type === 'service' || type === 'renovation' || type === 'consult') && (
                <Field label="Describe the work" hint="English, Hindi or Hinglish are all fine.">
                  <textarea
                    className={`${input} min-h-28`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Bathroom ki deewar mein seelan aa rahi hai…"
                  />
                </Field>
              )}

              {type === 'service' && (
                <div>
                  <span className={labelCls}>When?</span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['asap', 'Right now'],
                        ['today', 'Today'],
                        ['this_week', 'This week'],
                        ['flexible', 'Flexible'],
                      ] as const
                    ).map(([k, l]) => (
                      <Chip key={k} active={urgency === k} onClick={() => setUrgency(k)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {type === 'renovation' && (
                <>
                  <Field label="Property type">
                    <select
                      className={input}
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
                    >
                      <option value="apartment">Apartment / flat</option>
                      <option value="independent_house">Independent house</option>
                      <option value="villa">Villa</option>
                      <option value="commercial">Shop / office</option>
                      <option value="plot">Empty plot (new construction)</option>
                    </select>
                  </Field>
                  <div>
                    <span className={labelCls}>Scope</span>
                    <div className="flex flex-wrap gap-2">
                      {RENOVATION_SCOPE.map((s) => (
                        <Chip
                          key={s}
                          active={scope.includes(s)}
                          onClick={() =>
                            setScope((cur) =>
                              cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
                            )
                          }
                        >
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <Field label="Approx. area (sqft)">
                    <input
                      className={input}
                      inputMode="numeric"
                      value={areaSqft}
                      onChange={(e) => setAreaSqft(e.target.value.replace(/\D/g, ''))}
                      placeholder="1200"
                    />
                  </Field>
                </>
              )}

              {type === 'material_rfq' && (
                <div>
                  <span className={labelCls}>Items</span>
                  <div className="space-y-2">
                    {materials.map((m, i) => (
                      <div key={i} className="grid grid-cols-[1fr_90px_100px_auto] gap-2">
                        <input
                          className={input}
                          placeholder="OPC 53 cement"
                          value={m.name}
                          onChange={(e) =>
                            setMaterials((rows) =>
                              rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                            )
                          }
                        />
                        <input
                          className={input}
                          placeholder="Qty"
                          inputMode="decimal"
                          value={m.quantity}
                          onChange={(e) =>
                            setMaterials((rows) =>
                              rows.map((r, j) =>
                                j === i
                                  ? { ...r, quantity: e.target.value.replace(/[^\d.]/g, '') }
                                  : r,
                              ),
                            )
                          }
                        />
                        <select
                          className={input}
                          value={m.unit}
                          onChange={(e) =>
                            setMaterials((rows) =>
                              rows.map((r, j) =>
                                j === i ? { ...r, unit: e.target.value as MaterialRow['unit'] } : r,
                              ),
                            )
                          }
                        >
                          {UNITS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() =>
                            setMaterials((rows) =>
                              rows.length > 1 ? rows.filter((_, j) => j !== i) : rows,
                            )
                          }
                          className="grid w-11 place-items-center rounded-xl text-text-muted hover:bg-surface-muted"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setMaterials((rows) => [...rows, { name: '', quantity: '', unit: 'bag' }])
                    }
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600"
                  >
                    <Plus size={16} /> Add item
                  </button>
                  <p className="mt-2 text-xs text-text-muted">
                    Have a BOQ or a photo of your list? Upload it in the app and Setu AI fills these
                    in.
                  </p>
                </div>
              )}

              {type === 'equipment' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Equipment">
                    <input
                      className={input}
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                      placeholder="JCB 3DX"
                    />
                  </Field>
                  <Field label="Start date">
                    <input
                      type="date"
                      className={input}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Days needed">
                    <input
                      className={input}
                      inputMode="numeric"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value.replace(/\D/g, ''))}
                    />
                  </Field>
                  <div>
                    <span className={labelCls}>Operator</span>
                    <div className="flex gap-2">
                      <Chip active={withOperator} onClick={() => setWithOperator(true)}>
                        With operator
                      </Chip>
                      <Chip active={!withOperator} onClick={() => setWithOperator(false)}>
                        Machine only
                      </Chip>
                    </div>
                  </div>
                </div>
              )}

              {type === 'consult' && (
                <Field label="Topic">
                  <select
                    className={input}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as typeof topic)}
                  >
                    <option value="structural">Structural check</option>
                    <option value="architecture">Architecture / house plan</option>
                    <option value="interior">Interior design</option>
                    <option value="vastu">Vastu</option>
                    <option value="cost_estimate">Cost estimate</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Budget from (₹, optional)">
                  <input
                    className={input}
                    inputMode="numeric"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
                <Field label="Budget up to (₹, optional)">
                  <input
                    className={input}
                    inputMode="numeric"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <Field label="Sector">
                <select
                  className={input}
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  {SECTORS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}, Greater Noida
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Flat / house, tower and society">
                <input
                  className={input}
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="B-1203, Tower B, Ansal Golf Links"
                />
              </Field>
              <button
                type="button"
                onClick={locate}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  gps
                    ? 'border-success text-success'
                    : 'border-border text-navy-600 hover:border-navy-300'
                }`}
              >
                {locating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LocateFixed size={16} />
                )}
                {gps ? 'Exact location added' : 'Use my exact location'}
              </button>
              <p className="text-xs text-text-muted">
                Partners see only your sector until you hire them. Your full address and number are
                shared after hire.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Field label="Mobile number">
                <div className="flex gap-2">
                  <span className="grid place-items-center rounded-xl border border-border bg-surface-muted px-3 text-sm font-semibold text-text-muted">
                    +91
                  </span>
                  <input
                    className={input}
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
                    placeholder="98765 43210"
                    disabled={otpSent}
                  />
                </div>
              </Field>
              {otpSent && (
                <Field label="6-digit code">
                  <input
                    className={`${input} text-center text-2xl font-bold tracking-[0.5em]`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </Field>
              )}
              {otpSent && (
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="font-semibold text-navy-600"
                    onClick={() => {
                      setOtpSent(false);
                      setCode('');
                    }}
                  >
                    Change number
                  </button>
                  <button
                    type="button"
                    disabled={resendIn > 0 || busy}
                    onClick={sendOtp}
                    className="font-semibold text-orange-600 disabled:text-text-muted"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              )}
              <p className="text-xs text-text-muted">
                By continuing you agree to our terms and privacy notice. We use your number only for
                this requirement and your account.
              </p>
            </div>
          )}

          {step === 3 && posted && (
            <div className="py-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              >
                <CheckCircle2 size={72} className="mx-auto text-success" />
              </motion.div>
              <h1 className="mt-6 text-3xl font-extrabold text-navy-600">
                Your requirement is live
              </h1>
              <p className="mt-2 text-text-muted">
                “{posted.title}” · Ref {posted.id.slice(0, 8).toUpperCase()}
              </p>
              <ol className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm">
                {[
                  'We match verified pros near you',
                  'You get 2+ quotes within 24 hours on WhatsApp and the app',
                  'Compare, negotiate and hire when ready',
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <Link
                href="/"
                className="mt-10 inline-block rounded-full bg-navy-600 px-6 py-3 font-bold text-white"
              >
                Back to home
              </Link>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}

          {step < 3 && (
            <div className="mt-8 flex items-center justify-between">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep((s) => (s - 1) as Step);
                  }}
                  className="inline-flex items-center gap-1.5 font-semibold text-text-muted"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <span />
              )}
              {step < 2 && (
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-full bg-navy-600 px-6 py-3 font-bold text-white transition hover:bg-navy-700"
                >
                  Continue <ArrowRight size={16} />
                </button>
              )}
              {step === 2 && !otpSent && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={sendOtp}
                  className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-6 py-3 font-bold text-navy-800 disabled:opacity-60"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />} Send code
                </button>
              )}
              {step === 2 && otpSent && (
                <button
                  type="button"
                  disabled={busy || code.length !== 6}
                  onClick={verifyAndPost}
                  className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-6 py-3 font-bold text-navy-800 disabled:opacity-60"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />} Verify & post
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
