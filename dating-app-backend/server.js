import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'data.json')

// ---------- 아주 단순한 파일 기반 저장소 ----------
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        return { users: [], swipes: [], matches: [] }
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
}
function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

const app = express()
app.use(cors())
app.use(express.json())

// ---------- 회원가입 ----------
// body: { name, age, mbti, tag, tags: [] }
app.post('/api/signup', (req, res) => {
    const { name, age, mbti, tag, tags } = req.body
    if (!name || !age) {
        return res.status(400).json({ error: 'name과 age는 필수예요' })
    }
    const db = loadDB()
    const user = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        age,
        mbti: mbti || '',
        tag: tag || '',
        tags: tags || [],
        createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    saveDB(db)
    res.status(201).json(user)
})

// ---------- 전체 유저 목록 (본인 제외) ----------
app.get('/api/profiles', (req, res) => {
    const { excludeId } = req.query
    const db = loadDB()
    const profiles = db.users.filter((u) => u.id !== excludeId)
    res.json(profiles)
})

// ---------- 스와이프 (좋아요 / 패스) ----------
// body: { fromId, toId, action: 'like' | 'pass' }
app.post('/api/swipe', (req, res) => {
    const { fromId, toId, action } = req.body
    if (!fromId || !toId || !['like', 'pass'].includes(action)) {
        return res
            .status(400)
            .json({ error: 'fromId, toId, action이 필요해요' })
    }
    const db = loadDB()
    db.swipes.push({ fromId, toId, action, at: new Date().toISOString() })

    let matched = false
    if (action === 'like') {
        // 상대방이 이미 나를 좋아요 했는지 확인 -> 있으면 매칭 성립
        const reverseLike = db.swipes.find(
            (s) =>
                s.fromId === toId && s.toId === fromId && s.action === 'like',
        )
        if (reverseLike) {
            const alreadyMatched = db.matches.some(
                (m) =>
                    (m.userA === fromId && m.userB === toId) ||
                    (m.userA === toId && m.userB === fromId),
            )
            if (!alreadyMatched) {
                db.matches.push({
                    userA: fromId,
                    userB: toId,
                    at: new Date().toISOString(),
                })
            }
            matched = true
        }
    }

    saveDB(db)
    res.json({ ok: true, matched })
})

// ---------- 특정 유저의 매칭 목록 ----------
app.get('/api/matches/:userId', (req, res) => {
    const { userId } = req.params
    const db = loadDB()
    const myMatches = db.matches.filter(
        (m) => m.userA === userId || m.userB === userId,
    )
    const result = myMatches.map((m) => {
        const otherId = m.userA === userId ? m.userB : m.userA
        const other = db.users.find((u) => u.id === otherId)
        return { matchedAt: m.at, user: other }
    })
    res.json(result)
})

const PORT = 3001
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`)
})
