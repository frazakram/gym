import { test, expect, type Page } from '@playwright/test'

/**
 * End-to-end verification that the nutrition tracker actually persists to the
 * database through the real API routes: goals, log → totals update → edit →
 * delete, and favorites. Drives the API directly (with a real authenticated
 * session + CSRF) so it asserts on DB state, not just UI.
 */

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function registerAndLogin(page: Page): Promise<void> {
  const username = `nutri_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  await page.goto('/login')
  // Dismiss the cookie-consent banner so it doesn't intercept clicks.
  await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {})
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.getByPlaceholder('Enter your email or username').fill(username)
  await page.getByPlaceholder('Enter your password').fill('Test@1234')
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.reload()
  await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {})
  await page.getByPlaceholder('Enter your email or username').fill(username)
  await page.getByPlaceholder('Enter your password').fill('Test@1234')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  // Wait until the session cookie is set (redirect to dashboard or onboarding).
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 }).catch(() => {})
}

/** Read the CSRF token (sets the cookie too) for state-changing requests. */
async function csrfToken(page: Page): Promise<string> {
  const res = await page.request.get('/api/csrf')
  const data = await res.json()
  return data.token as string
}

test.describe('Nutrition tracker — DB round-trip', () => {
  test('goals, log, edit, delete, favorites all persist', async ({ page }) => {
    await registerAndLogin(page)
    const token = await csrfToken(page)
    const json = { 'content-type': 'application/json', 'x-csrf-token': token }
    const date = todayStr()

    // --- Create a minimal profile (goals are stored on the profile row) ---
    const profileRes = await page.request.put('/api/profile', {
      headers: json,
      data: {
        age: 28, weight: 75, height: 178, gender: 'Male', goal: 'Muscle gain',
        level: 'Beginner', tenure: '3 months', cuisine: null,
      },
    })
    expect(profileRes.ok()).toBeTruthy()

    // --- Set goals via TDEE calc (save) ---
    const goalsRes = await page.request.post('/api/nutrition/goals', {
      headers: json,
      data: { age: 28, weight_kg: 75, height_cm: 178, sex: 'Male', activity_level: 'moderate', goal_type: 'surplus', save: true },
    })
    // Under ALLOW_MOCK_AUTH the login yields a mock user with no real DB profile
    // row, so goals can't be saved — skip the write round-trip in that mode.
    test.skip(goalsRes.status() === 409, 'Round-trip needs real auth (ALLOW_MOCK_AUTH has no DB profile)')
    expect(goalsRes.ok()).toBeTruthy()
    const goalsBody = await goalsRes.json()
    expect(goalsBody.goals.daily_calorie_goal).toBeGreaterThan(0)

    // --- Summary starts empty ---
    let summary = await (await page.request.get(`/api/nutrition/summary?date=${date}`)).json()
    expect(summary.goals.daily_calorie_goal).toBeGreaterThan(0)
    expect(summary.totals.calories).toBe(0)
    expect(summary.entries.length).toBe(0)

    // --- Log an entry ---
    const createRes = await page.request.post('/api/nutrition/food-entries', {
      headers: json,
      data: { entry_date: date, source: 'manual', name: 'Test Oats Bowl', calories: 500, protein_g: 40, carb_g: 30, fat_g: 20, quantity: 1, unit: 'serving' },
    })
    expect(createRes.status()).toBe(201)
    const entryId = (await createRes.json()).entry.id as number
    expect(entryId).toBeGreaterThan(0)

    // --- Totals reflect the entry ---
    summary = await (await page.request.get(`/api/nutrition/summary?date=${date}`)).json()
    expect(summary.totals.calories).toBe(500)
    expect(summary.totals.protein_g).toBe(40)
    expect(summary.entries.length).toBe(1)
    expect(summary.entries[0].name).toBe('Test Oats Bowl')

    // --- Edit the entry (double the quantity + macros) ---
    const patchRes = await page.request.patch(`/api/nutrition/food-entries/${entryId}`, {
      headers: json,
      data: { calories: 1000, protein_g: 80, quantity: 2 },
    })
    expect(patchRes.ok()).toBeTruthy()
    summary = await (await page.request.get(`/api/nutrition/summary?date=${date}`)).json()
    expect(summary.totals.calories).toBe(1000)
    expect(summary.totals.protein_g).toBe(80)

    // --- Delete the entry → back to empty ---
    const delRes = await page.request.delete(`/api/nutrition/food-entries/${entryId}`, { headers: json })
    expect(delRes.ok()).toBeTruthy()
    summary = await (await page.request.get(`/api/nutrition/summary?date=${date}`)).json()
    expect(summary.totals.calories).toBe(0)
    expect(summary.entries.length).toBe(0)

    // --- Favorites: add, list, delete ---
    const favRes = await page.request.post('/api/nutrition/favorites', {
      headers: json,
      data: { source: 'manual', name: 'Test Protein Shake', calories: 200, protein_g: 30, carb_g: 5, fat_g: 3, quantity: 1, unit: 'serving' },
    })
    expect(favRes.status()).toBe(201)
    const favId = (await favRes.json()).favorite.id as number

    const favList = await (await page.request.get('/api/nutrition/favorites')).json()
    expect(favList.favorites.some((f: { id: number }) => f.id === favId)).toBeTruthy()

    const favDel = await page.request.delete(`/api/nutrition/favorites/${favId}`, { headers: json })
    expect(favDel.ok()).toBeTruthy()
  })

  test('food search + barcode lookup return data (Open Food Facts)', async ({ page }) => {
    await registerAndLogin(page)

    const searchRes = await page.request.get('/api/nutrition/search?q=oats')
    expect(searchRes.ok()).toBeTruthy()
    const search = await searchRes.json()
    expect(Array.isArray(search.results)).toBeTruthy()

    // Nutella — a barcode that reliably exists in Open Food Facts.
    const barcodeRes = await page.request.get('/api/nutrition/barcode?barcode=3017620422003')
    expect(barcodeRes.ok()).toBeTruthy()
    const barcode = await barcodeRes.json()
    expect(barcode).toHaveProperty('found')
  })

  test('routes reject unauthenticated access', async ({ request }) => {
    const res = await request.get('/api/nutrition/summary')
    expect(res.status()).toBe(401)
  })
})
