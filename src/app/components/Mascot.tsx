export type Mood = 'hello' | 'rest' | 'cheer' | 'oops'

/**
 * เพนกวินประจำแอป — วาดเป็น SVG ไม่ใช่รูป
 * เพราะต้องคมตอนตั้งเป็น "จอฉาย" และต้องเปลี่ยนสีตามสีหลักที่ผู้ใช้เลือก
 *
 * ตั้งใจไม่มีหนังสือเรียนหรือของโรงเรียนติดมา — Solo Freelance เป็นของฟรีแลนซ์ทุกอาชีพ
 * ไม่ใช่แอปติวหนังสือ และคนที่มองจอคือเจ้าของงาน ไม่ใช่นักเรียน
 */
export function Mascot({ mood = 'hello', size = 96 }: { mood?: Mood; size?: number }) {
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 120 120"
      role="img" aria-hidden="true" focusable="false">
      {/* ตัว */}
      <ellipse cx="60" cy="70" rx="38" ry="40" fill="var(--mascot-body)" />
      {/* ท้อง/เสื้อฮู้ด */}
      <ellipse cx="60" cy="88" rx="26" ry="22" fill="var(--mascot-belly)" />
      {/* ตัว S บนเสื้อ */}
      <text x="60" y="95" textAnchor="middle" fontSize="15" fontWeight="700"
        fill="var(--brand)" fontFamily="var(--font)">S</text>

      {/* ครีบ */}
      {mood === 'hello' ? (
        <ellipse cx="14" cy="62" rx="8" ry="16" fill="var(--mascot-body)" transform="rotate(-38 14 62)" />
      ) : (
        <ellipse cx="22" cy="72" rx="9" ry="16" fill="var(--mascot-body)" />
      )}
      <ellipse cx="98" cy="72" rx="9" ry="16" fill="var(--mascot-body)" />

      {/* เท้า */}
      <ellipse cx="46" cy="107" rx="10" ry="6" fill="var(--mascot-beak)" />
      <ellipse cx="74" cy="107" rx="10" ry="6" fill="var(--mascot-beak)" />

      {/* หูฟัง */}
      <path d="M24 46a36 30 0 0 1 72 0" fill="none" stroke="var(--mascot-gear)" strokeWidth="6" strokeLinecap="round" />
      <rect x="14" y="42" width="14" height="20" rx="7" fill="var(--mascot-gear)" />
      <rect x="92" y="42" width="14" height="20" rx="7" fill="var(--mascot-gear)" />

      {/* แว่น */}
      <circle cx="47" cy="56" r="13" fill="var(--mascot-lens)" stroke="var(--mascot-gear)" strokeWidth="3" />
      <circle cx="73" cy="56" r="13" fill="var(--mascot-lens)" stroke="var(--mascot-gear)" strokeWidth="3" />
      <path d="M60 56h0" stroke="var(--mascot-gear)" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 56h8" stroke="var(--mascot-gear)" strokeWidth="3" />

      {/* ตา — เปลี่ยนตามอารมณ์ */}
      {mood === 'rest' ? (
        <>
          <path d="M41 57q6 5 12 0" fill="none" stroke="var(--mascot-eye)" strokeWidth="3" strokeLinecap="round" />
          <path d="M67 57q6 5 12 0" fill="none" stroke="var(--mascot-eye)" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : mood === 'cheer' ? (
        <>
          <path d="M41 58q6-7 12 0" fill="none" stroke="var(--mascot-eye)" strokeWidth="3" strokeLinecap="round" />
          <path d="M67 58q6-7 12 0" fill="none" stroke="var(--mascot-eye)" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="47" cy="56" r={mood === 'oops' ? 7 : 6} fill="var(--mascot-eye)" />
          <circle cx="73" cy="56" r={mood === 'oops' ? 7 : 6} fill="var(--mascot-eye)" />
          <circle cx="49" cy="53" r="2.2" fill="var(--mascot-lens)" />
          <circle cx="75" cy="53" r="2.2" fill="var(--mascot-lens)" />
        </>
      )}

      {/* ปาก */}
      {mood === 'oops' ? (
        <ellipse cx="60" cy="72" rx="6" ry="7" fill="var(--mascot-beak)" />
      ) : (
        <path d="M54 69h12l-6 8z" fill="var(--mascot-beak)" />
      )}

      {/* แก้ม */}
      <ellipse cx="34" cy="68" rx="6" ry="4" fill="var(--mascot-blush)" />
      <ellipse cx="86" cy="68" rx="6" ry="4" fill="var(--mascot-blush)" />

      {/* ของประกอบเล็ก ๆ ตามอารมณ์ */}
      {mood === 'cheer' && (
        <path d="M100 26l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="var(--warn)" />
      )}
      {mood === 'rest' && (
        <>
          <text x="99" y="26" fontSize="13" fontWeight="700" fill="var(--muted)" fontFamily="var(--font)">z</text>
          <text x="108" y="16" fontSize="9" fontWeight="700" fill="var(--muted)" fontFamily="var(--font)">z</text>
        </>
      )}
      {mood === 'oops' && (
        <text x="98" y="28" fontSize="20" fontWeight="700" fill="var(--danger)" fontFamily="var(--font)">!</text>
      )}
    </svg>
  )
}
