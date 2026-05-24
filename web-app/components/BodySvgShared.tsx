import { MuscleGroup } from '@/lib/exercise-muscles'

interface BodySvgSharedProps {
  fillFor: (muscle: MuscleGroup) => string
  side: 'front' | 'back'
  className?: string
}

const BASE_FILL = 'rgba(122, 148, 144, 0.18)'
const BASE_STROKE = 'rgba(122, 148, 144, 0.45)'
const SILHOUETTE_FILL = 'rgba(122, 148, 144, 0.08)'

function Silhouette() {
  const fill = SILHOUETTE_FILL
  const stroke = BASE_STROKE
  const sw = 0.5
  return (
    <g pointerEvents="none">
      {/* Head */}
      <ellipse cx="60" cy="18" rx="13" ry="15" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Torso (V-tapered) */}
      <path
        d="M40 44 Q60 38 80 44 L82 110 Q60 116 38 110 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Hips */}
      <path
        d="M38 110 Q60 118 82 110 L80 140 Q60 144 40 140 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Right arm (upper + lower) */}
      <path
        d="M80 44 Q94 48 94 60 L92 105 L88 128 L80 128 L82 105 L78 60 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Left arm */}
      <path
        d="M40 44 Q26 48 26 60 L28 105 L32 128 L40 128 L38 105 L42 60 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Right leg */}
      <path
        d="M62 140 L80 140 L78 188 L76 230 L68 234 L62 230 L60 188 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
      {/* Left leg */}
      <path
        d="M58 140 L40 140 L42 188 L44 230 L52 234 L58 230 L60 188 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    </g>
  )
}

export function BodySvgShared({ fillFor, side, className = "w-full h-full" }: BodySvgSharedProps) {
  const stroke = { stroke: BASE_STROKE, strokeWidth: 0.5, strokeLinejoin: 'round' as const }

  if (side === 'front') {
    return (
      <svg viewBox="0 0 120 240" className={className} aria-label="Front body diagram">
        <Silhouette />

        {/* Head */}
        <ellipse cx="60" cy="18" rx="13" ry="15" fill={BASE_FILL} {...stroke} />

        {/* Neck (sternocleidomastoid) */}
        <path d="M54 33 Q60 38 66 33 L65 40 Q60 42 55 40 Z" fill={fillFor('neck')} {...stroke} />

        {/* Trapezius (front view — visible at neck-shoulder slope) */}
        <path d="M50 38 Q60 34 70 38 L74 48 Q60 46 46 48 Z" fill={fillFor('traps')} {...stroke} />

        {/* Deltoids (front fibers) */}
        <path d="M44 44 Q34 44 30 56 Q30 68 38 70 Q44 64 46 50 Z" fill={fillFor('shoulders')} {...stroke} />
        <path d="M76 44 Q86 44 90 56 Q90 68 82 70 Q76 64 74 50 Z" fill={fillFor('shoulders')} {...stroke} />

        {/* Pectorals — sweeping curves with sternal separation */}
        <path d="M46 50 Q54 50 59 56 L59 78 Q55 80 50 78 Q44 70 44 60 Z" fill={fillFor('chest')} {...stroke} />
        <path d="M74 50 Q66 50 61 56 L61 78 Q65 80 70 78 Q76 70 76 60 Z" fill={fillFor('chest')} {...stroke} />

        {/* Biceps */}
        <path d="M30 70 Q26 76 27 90 Q32 96 38 90 Q38 78 36 72 Z" fill={fillFor('biceps')} {...stroke} />
        <path d="M90 70 Q94 76 93 90 Q88 96 82 90 Q82 78 84 72 Z" fill={fillFor('biceps')} {...stroke} />

        {/* Forearms — tapered down to wrist */}
        <path d="M27 92 Q24 108 26 124 L34 124 Q35 108 36 92 Z" fill={fillFor('forearms')} {...stroke} />
        <path d="M93 92 Q96 108 94 124 L86 124 Q85 108 84 92 Z" fill={fillFor('forearms')} {...stroke} />

        {/* Abs — six-pack (3 rows × 2 cols) */}
        <path d="M52 80 L58 80 L58 88 L52 88 Z" fill={fillFor('abs')} {...stroke} />
        <path d="M62 80 L68 80 L68 88 L62 88 Z" fill={fillFor('abs')} {...stroke} />
        <path d="M52 90 L58 90 L58 98 L52 98 Z" fill={fillFor('abs')} {...stroke} />
        <path d="M62 90 L68 90 L68 98 L62 98 Z" fill={fillFor('abs')} {...stroke} />
        <path d="M52 100 L58 100 L58 110 L52 110 Z" fill={fillFor('abs')} {...stroke} />
        <path d="M62 100 L68 100 L68 110 L62 110 Z" fill={fillFor('abs')} {...stroke} />

        {/* Obliques — V-shape flanking the abs */}
        <path d="M44 76 Q48 92 50 112 L52 112 L52 78 Z" fill={fillFor('obliques')} {...stroke} />
        <path d="M76 76 Q72 92 70 112 L68 112 L68 78 Z" fill={fillFor('obliques')} {...stroke} />

        {/* Adductors (inner thigh wedge) */}
        <path d="M52 134 L68 134 L65 152 L60 156 L55 152 Z" fill={fillFor('adductors')} {...stroke} />

        {/* Quads — teardrop with vastus lateralis emphasis */}
        <path d="M42 138 Q38 160 42 184 L52 184 Q54 160 52 138 Z" fill={fillFor('quads')} {...stroke} />
        <path d="M78 138 Q82 160 78 184 L68 184 Q66 160 68 138 Z" fill={fillFor('quads')} {...stroke} />

        {/* Knees (decorative) */}
        <ellipse cx="47" cy="190" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
        <ellipse cx="73" cy="190" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />

        {/* Tibialis (shin) - subtle, not a tracked muscle */}
        <path d="M44 196 Q42 215 46 230 L52 230 Q52 215 50 196 Z" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
        <path d="M76 196 Q78 215 74 230 L68 230 Q68 215 70 196 Z" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
      </svg>
    )
  }

  // BACK
  return (
    <svg viewBox="0 0 120 240" className={className} aria-label="Back body diagram">
      <Silhouette />

      {/* Head */}
      <ellipse cx="60" cy="18" rx="13" ry="15" fill={BASE_FILL} {...stroke} />

      {/* Neck */}
      <path d="M54 33 Q60 38 66 33 L65 40 Q60 42 55 40 Z" fill={fillFor('neck')} {...stroke} />

      {/* Trapezius — kite spreading from skull to mid-back */}
      <path d="M50 36 Q60 32 70 36 L78 50 L60 62 L42 50 Z" fill={fillFor('traps')} {...stroke} />
      <path d="M42 50 L60 62 L78 50 L74 70 L60 76 L46 70 Z" fill={fillFor('traps')} {...stroke} />

      {/* Rear deltoids */}
      <path d="M44 44 Q34 44 30 56 Q30 68 38 70 Q44 64 46 50 Z" fill={fillFor('shoulders')} {...stroke} />
      <path d="M76 44 Q86 44 90 56 Q90 68 82 70 Q76 64 74 50 Z" fill={fillFor('shoulders')} {...stroke} />

      {/* Upper back (rhomboids / mid-traps) */}
      <path d="M46 70 L74 70 L72 86 L48 86 Z" fill={fillFor('upper_back')} {...stroke} />

      {/* Lats — classic V flowing from armpits to lower back */}
      <path d="M44 70 Q36 84 40 104 L52 110 L52 80 Z" fill={fillFor('lats')} {...stroke} />
      <path d="M76 70 Q84 84 80 104 L68 110 L68 80 Z" fill={fillFor('lats')} {...stroke} />

      {/* Triceps — horseshoe shape on the back of the arm */}
      <path d="M30 70 Q26 76 27 90 Q32 96 38 90 Q38 78 36 72 Z" fill={fillFor('triceps')} {...stroke} />
      <path d="M90 70 Q94 76 93 90 Q88 96 82 90 Q82 78 84 72 Z" fill={fillFor('triceps')} {...stroke} />

      {/* Forearms */}
      <path d="M27 92 Q24 108 26 124 L34 124 Q35 108 36 92 Z" fill={fillFor('forearms')} {...stroke} />
      <path d="M93 92 Q96 108 94 124 L86 124 Q85 108 84 92 Z" fill={fillFor('forearms')} {...stroke} />

      {/* Lower back (erector spinae) */}
      <path d="M52 92 L68 92 Q70 104 68 116 L52 116 Q50 104 52 92 Z" fill={fillFor('lower_back')} {...stroke} />

      {/* Glutes — twin rounded bulges */}
      <path d="M44 118 Q52 116 60 120 Q60 138 50 142 Q42 138 42 128 Z" fill={fillFor('glutes')} {...stroke} />
      <path d="M76 118 Q68 116 60 120 Q60 138 70 142 Q78 138 78 128 Z" fill={fillFor('glutes')} {...stroke} />

      {/* Hamstrings */}
      <path d="M42 144 Q40 168 44 188 L52 188 Q54 166 52 144 Z" fill={fillFor('hamstrings')} {...stroke} />
      <path d="M78 144 Q80 168 76 188 L68 188 Q66 166 68 144 Z" fill={fillFor('hamstrings')} {...stroke} />

      {/* Knees (decorative back-of-knee) */}
      <ellipse cx="47" cy="194" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />
      <ellipse cx="73" cy="194" rx="5" ry="3" fill={SILHOUETTE_FILL} stroke={BASE_STROKE} strokeWidth="0.4" />

      {/* Calves — gastrocnemius diamond */}
      <path d="M42 200 Q40 214 44 228 L52 228 Q53 214 51 200 Z" fill={fillFor('calves')} {...stroke} />
      <path d="M78 200 Q80 214 76 228 L68 228 Q67 214 69 200 Z" fill={fillFor('calves')} {...stroke} />
    </svg>
  )
}
