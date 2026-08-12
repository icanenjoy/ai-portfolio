import React, { useState, useRef, useEffect } from 'react'
import {
    Heart,
    X,
    Sparkles,
    Compass,
    MessageCircle,
    User,
    RotateCcw,
    Loader2,
} from 'lucide-react'

const API_BASE = 'http://localhost:3001'

const PALETTE = [
    '#E8604C',
    '#4C6FE8',
    '#9C4CE8',
    '#E8A34C',
    '#4CE8A3',
    '#E84C8A',
]

function colorFor(id) {
    let sum = 0
    for (const ch of String(id)) sum += ch.charCodeAt(0)
    return PALETTE[sum % PALETTE.length]
}

// MBTI 두 개를 넣으면 50~99 사이의 그럴듯한 궁합 퍼센트를 만들어주는 연출용 함수
function compatFor(a, b) {
    const s = `${a || ''}-${b || ''}`
    let sum = 0
    for (const ch of s) sum += ch.charCodeAt(0)
    return 50 + (sum % 50)
}

function initials(name) {
    return (name || '?').slice(0, 1)
}

export default function App() {
    const [stage, setStage] = useState('signup') // 'signup' | 'app'
    const [form, setForm] = useState({
        name: '',
        age: '',
        mbti: '',
        tag: '',
        tags: '',
    })
    const [signingUp, setSigningUp] = useState(false)
    const [signupError, setSignupError] = useState('')

    const [me, setMe] = useState(null)
    const [profiles, setProfiles] = useState([])
    const [loadingProfiles, setLoadingProfiles] = useState(false)
    const [index, setIndex] = useState(0)

    const [tab, setTab] = useState('discover')
    const [matches, setMatches] = useState([])
    const [loadingMatches, setLoadingMatches] = useState(false)

    const [modalMatch, setModalMatch] = useState(null)
    const [dragX, setDragX] = useState(0)
    const [leaving, setLeaving] = useState(null)
    const dragging = useRef(false)
    const startX = useRef(0)

    async function handleSignup(e) {
        e.preventDefault()
        if (!form.name || !form.age) {
            setSignupError('이름과 나이는 꼭 입력해주세요')
            return
        }
        setSigningUp(true)
        setSignupError('')
        try {
            const res = await fetch(`${API_BASE}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    age: Number(form.age),
                    mbti: form.mbti.toUpperCase(),
                    tag: form.tag,
                    tags: form.tags
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                }),
            })
            if (!res.ok) throw new Error('가입 요청이 실패했어요')
            const user = await res.json()
            setMe(user)
            setStage('app')
        } catch (err) {
            setSignupError(
                '서버에 연결할 수 없어요. 백엔드가 http://localhost:3001 에서 실행 중인지 확인해주세요.',
            )
        } finally {
            setSigningUp(false)
        }
    }

    useEffect(() => {
        if (stage !== 'app' || !me) return
        setLoadingProfiles(true)
        fetch(`${API_BASE}/api/profiles?excludeId=${me.id}`)
            .then((r) => r.json())
            .then((data) => setProfiles(data))
            .catch(() => setProfiles([]))
            .finally(() => setLoadingProfiles(false))
    }, [stage, me])

    useEffect(() => {
        if (tab !== 'matches' || !me) return
        setLoadingMatches(true)
        fetch(`${API_BASE}/api/matches/${me.id}`)
            .then((r) => r.json())
            .then((data) => setMatches(data))
            .catch(() => setMatches([]))
            .finally(() => setLoadingMatches(false))
    }, [tab, me])

    const profile = profiles[index]
    const done = !loadingProfiles && index >= profiles.length

    async function commit(direction) {
        if (!profile) return
        setLeaving(direction)
        try {
            const res = await fetch(`${API_BASE}/api/swipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: me.id,
                    toId: profile.id,
                    action: direction === 'like' ? 'like' : 'pass',
                }),
            })
            const data = await res.json()
            if (data.matched) {
                setTimeout(() => setModalMatch(profile), 260)
            }
        } catch (err) {
            // 서버 연결이 안 되어도 카드 넘김 자체는 계속 진행
        }
        setTimeout(() => {
            setIndex((i) => i + 1)
            setLeaving(null)
            setDragX(0)
        }, 260)
    }

    function onPointerDown(e) {
        if (done || !profile) return
        dragging.current = true
        startX.current = e.clientX
    }
    function onPointerMove(e) {
        if (!dragging.current) return
        setDragX(e.clientX - startX.current)
    }
    function onPointerUp() {
        if (!dragging.current) return
        dragging.current = false
        if (dragX > 100) commit('like')
        else if (dragX < -100) commit('pass')
        else setDragX(0)
    }

    function reset() {
        setIndex(0)
        setDragX(0)
        setLeaving(null)
    }

    const rotate = dragX / 18
    const cardStyle = leaving
        ? {
              transform: `translateX(${leaving === 'like' ? 600 : -600}px) rotate(${leaving === 'like' ? 30 : -30}deg)`,
              opacity: 0,
              transition: 'transform 0.28s ease, opacity 0.28s ease',
          }
        : {
              transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
              transition: dragging.current ? 'none' : 'transform 0.25s ease',
          }

    // ---------- 회원가입 화면 ----------
    if (stage === 'signup') {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#2B1B2E] p-4 font-sans">
                <form
                    onSubmit={handleSignup}
                    className="w-full max-w-[380px] bg-[#FBEFF0] rounded-[24px] p-7 border border-[#EAD9DA]">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={18} color="#D8A34C" />
                        <span className="font-bold text-lg text-[#2B1B2E]">
                            인연카드 가입
                        </span>
                    </div>
                    <p className="text-xs text-[#5A4750] mb-5">
                        프로필을 만들면 다른 사람들의 카드를 볼 수 있어요
                    </p>

                    <div className="flex flex-col gap-3">
                        <input
                            className="border border-[#EAD9DA] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#E8604C]"
                            placeholder="이름"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />
                        <input
                            type="number"
                            className="border border-[#EAD9DA] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#E8604C]"
                            placeholder="나이"
                            value={form.age}
                            onChange={(e) =>
                                setForm({ ...form, age: e.target.value })
                            }
                        />
                        <input
                            className="border border-[#EAD9DA] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#E8604C]"
                            placeholder="MBTI (예: ENFP)"
                            value={form.mbti}
                            onChange={(e) =>
                                setForm({ ...form, mbti: e.target.value })
                            }
                        />
                        <input
                            className="border border-[#EAD9DA] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#E8604C]"
                            placeholder="한 줄 소개"
                            value={form.tag}
                            onChange={(e) =>
                                setForm({ ...form, tag: e.target.value })
                            }
                        />
                        <input
                            className="border border-[#EAD9DA] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#E8604C]"
                            placeholder="관심사 (쉼표로 구분: 여행, 커피)"
                            value={form.tags}
                            onChange={(e) =>
                                setForm({ ...form, tags: e.target.value })
                            }
                        />
                    </div>

                    {signupError && (
                        <p className="text-xs text-[#E8604C] mt-3">
                            {signupError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={signingUp}
                        className="mt-5 w-full py-2.5 rounded-full text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: '#E8604C' }}>
                        {signingUp && (
                            <Loader2 size={15} className="animate-spin" />
                        )}
                        {signingUp ? '가입 중...' : '가입하고 시작하기'}
                    </button>
                </form>
            </div>
        )
    }

    // ---------- 메인 앱 ----------
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#2B1B2E] p-4 font-sans">
            <div className="w-full max-w-[380px] bg-[#2B1B2E] rounded-[28px] overflow-hidden shadow-2xl border border-[#472F4A]">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-1.5 text-[#FBEFF0]">
                        <Sparkles size={18} color="#D8A34C" />
                        <span className="font-bold text-lg tracking-tight">
                            인연카드
                        </span>
                    </div>
                    <div className="text-[#D8A34C] text-xs font-mono">
                        {me?.name}님
                    </div>
                </div>

                <div className="bg-[#FBEFF0] rounded-t-[24px] min-h-[560px] px-4 pt-5 pb-4 relative">
                    {tab === 'discover' && (
                        <div className="relative h-[480px] select-none">
                            {loadingProfiles ? (
                                <div className="h-full flex items-center justify-center text-[#5A4750]">
                                    <Loader2
                                        size={20}
                                        className="animate-spin"
                                    />
                                </div>
                            ) : !done && profile ? (
                                <>
                                    {profiles
                                        .slice(index + 1, index + 3)
                                        .map((p, i) => (
                                            <div
                                                key={p.id}
                                                className="absolute inset-0 rounded-[20px] bg-white border border-[#EAD9DA]"
                                                style={{
                                                    transform: `scale(${0.96 - i * 0.03}) translateY(${(i + 1) * 10}px)`,
                                                    zIndex: 1 - i,
                                                }}
                                            />
                                        ))}

                                    <div
                                        className="absolute inset-0 rounded-[20px] bg-white border border-[#EAD9DA] overflow-hidden z-10 cursor-grab active:cursor-grabbing"
                                        style={cardStyle}
                                        onPointerDown={onPointerDown}
                                        onPointerMove={onPointerMove}
                                        onPointerUp={onPointerUp}
                                        onPointerLeave={onPointerUp}>
                                        <div className="h-[3px] w-full flex justify-between px-3 pt-2">
                                            {Array.from({ length: 14 }).map(
                                                (_, i) => (
                                                    <span
                                                        key={i}
                                                        className="w-1.5 h-1.5 rounded-full bg-[#FBEFF0] border border-[#EAD9DA]"
                                                    />
                                                ),
                                            )}
                                        </div>

                                        <div
                                            className="h-[230px] flex items-center justify-center text-white text-6xl font-bold"
                                            style={{
                                                background: `linear-gradient(150deg, ${colorFor(profile.id)}, #2B1B2E)`,
                                            }}>
                                            {initials(profile.name)}
                                        </div>

                                        <div className="p-5">
                                            <div className="flex items-baseline justify-between">
                                                <h2 className="text-xl font-bold text-[#2B1B2E]">
                                                    {profile.name},{' '}
                                                    {profile.age}
                                                </h2>
                                                <span className="text-xs font-mono px-2 py-1 rounded-full bg-[#FBEFF0] text-[#2B1B2E] border border-[#EAD9DA]">
                                                    {profile.mbti || '?'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[#5A4750] mt-2">
                                                {profile.tag}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {(profile.tags || []).map(
                                                    (t) => (
                                                        <span
                                                            key={t}
                                                            className="text-xs px-2 py-1 rounded-full bg-[#FBEFF0] text-[#5A4750] border border-[#EAD9DA]">
                                                            #{t}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                            <div className="mt-4 flex items-center gap-2">
                                                <div className="flex-1 h-2 rounded-full bg-[#EAD9DA] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${compatFor(me?.mbti, profile.mbti)}%`,
                                                            background:
                                                                '#E8604C',
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-[#E8604C] font-semibold">
                                                    {compatFor(
                                                        me?.mbti,
                                                        profile.mbti,
                                                    )}
                                                    % 궁합
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {dragX > 40 && (
                                        <div className="absolute top-8 left-6 z-20 rotate-[-12deg] border-2 border-[#E8604C] text-[#E8604C] font-bold px-3 py-1 rounded-lg text-sm">
                                            LIKE
                                        </div>
                                    )}
                                    {dragX < -40 && (
                                        <div className="absolute top-8 right-6 z-20 rotate-[12deg] border-2 border-[#5A4750] text-[#5A4750] font-bold px-3 py-1 rounded-lg text-sm">
                                            PASS
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-[#5A4750]">
                                    <Sparkles size={30} color="#D8A34C" />
                                    <p className="font-semibold text-[#2B1B2E]">
                                        {profiles.length === 0
                                            ? '아직 등록된 다른 사용자가 없어요'
                                            : '오늘의 카드를 모두 확인했어요'}
                                    </p>
                                    <p className="text-sm">
                                        {profiles.length === 0
                                            ? '다른 브라우저에서 가입하거나 서버에 seed 데이터를 넣어보세요'
                                            : '내일 새로운 인연이 도착해요'}
                                    </p>
                                    {profiles.length > 0 && (
                                        <button
                                            onClick={reset}
                                            className="mt-2 flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-full bg-white border border-[#EAD9DA]">
                                            <RotateCcw size={13} /> 다시 보기
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'discover' && !done && profile && (
                        <div className="flex items-center justify-center gap-6 mt-6">
                            <button
                                aria-label="패스"
                                onClick={() => commit('pass')}
                                className="w-14 h-14 rounded-full bg-white border border-[#EAD9DA] flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                                <X size={22} color="#5A4750" />
                            </button>
                            <button
                                aria-label="좋아요"
                                onClick={() => commit('like')}
                                className="w-16 h-16 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                                style={{ background: '#E8604C' }}>
                                <Heart size={26} color="#fff" fill="#fff" />
                            </button>
                        </div>
                    )}

                    {tab === 'matches' && (
                        <div className="pt-2">
                            <h3 className="font-bold text-[#2B1B2E] mb-3">
                                매칭된 인연 ({matches.length})
                            </h3>
                            {loadingMatches ? (
                                <div className="flex justify-center py-8 text-[#5A4750]">
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                </div>
                            ) : matches.length === 0 ? (
                                <p className="text-sm text-[#5A4750]">
                                    아직 매칭된 상대가 없어요. 카드를 넘기며
                                    좋아요를 눌러보세요.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {matches.map(
                                        ({ user, matchedAt }) =>
                                            user && (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center gap-3 bg-white border border-[#EAD9DA] rounded-xl p-3">
                                                    <div
                                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                                                        style={{
                                                            background:
                                                                colorFor(
                                                                    user.id,
                                                                ),
                                                        }}>
                                                        {initials(user.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-[#2B1B2E] text-sm">
                                                            {user.name} ·{' '}
                                                            {user.mbti}
                                                        </div>
                                                        <div className="text-xs text-[#5A4750] truncate">
                                                            {user.tag}
                                                        </div>
                                                    </div>
                                                    <MessageCircle
                                                        size={16}
                                                        color="#E8604C"
                                                        className="ml-auto shrink-0"
                                                    />
                                                </div>
                                            ),
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'profile' && (
                        <div className="pt-2 text-center">
                            <div
                                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-xl mb-3"
                                style={{ background: colorFor(me?.id) }}>
                                {initials(me?.name)}
                            </div>
                            <h3 className="font-bold text-[#2B1B2E]">
                                {me?.name}, {me?.age}
                            </h3>
                            <p className="text-sm text-[#5A4750] mt-1">
                                {me?.mbti} · {me?.tag}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-[#FBEFF0] flex justify-around border-t border-[#EAD9DA] px-2 py-3">
                    {[
                        { id: 'discover', icon: Compass, label: '탐색' },
                        { id: 'matches', icon: Heart, label: '매칭' },
                        { id: 'profile', icon: User, label: '프로필' },
                    ].map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className="flex flex-col items-center gap-1 px-3 py-1">
                            <Icon
                                size={18}
                                color={tab === id ? '#E8604C' : '#5A4750'}
                                fill={
                                    tab === id && id === 'matches'
                                        ? '#E8604C'
                                        : 'none'
                                }
                            />
                            <span
                                className="text-[10px]"
                                style={{
                                    color: tab === id ? '#E8604C' : '#5A4750',
                                }}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {modalMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1B2E]/80 p-4">
                    <div className="bg-[#FBEFF0] rounded-[24px] p-7 text-center max-w-[320px] border border-[#EAD9DA]">
                        <Sparkles
                            size={26}
                            color="#D8A34C"
                            className="mx-auto mb-2"
                        />
                        <h3 className="text-xl font-bold text-[#2B1B2E]">
                            인연이 닿았어요!
                        </h3>
                        <p className="text-sm text-[#5A4750] mt-2">
                            {modalMatch.name}님과 매칭됐어요
                        </p>
                        <button
                            onClick={() => setModalMatch(null)}
                            className="mt-5 w-full py-2.5 rounded-full text-white font-semibold text-sm"
                            style={{ background: '#E8604C' }}>
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
