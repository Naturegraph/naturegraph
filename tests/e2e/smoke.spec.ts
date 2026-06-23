/**
 * Smoke tests E2E : pages publiques critiques
 * ============================================================================
 *
 * Verifie qu'aucune page publique n'est cassee a chaud apres deploy.
 * Si l'un de ces tests passe au rouge, c'est qu'un build casse a slip
 * en prod : alerter immediatement.
 *
 * Refs : T-007 + T-009 (MASTER_TODO) + BATCH 20
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke tests : pages publiques', () => {
  test('Landing page se charge et contient le hero', async ({ page }) => {
    await page.goto('/')

    // Le titre de l'onglet doit contenir "Naturegraph"
    await expect(page).toHaveTitle(/Naturegraph/)

    // Hero section visible (presence du nom du produit dans la nav)
    await expect(page.locator('body')).toContainText('Naturegraph')
  })

  test('Page /auth est accessible (signup / login)', async ({ page }) => {
    await page.goto('/auth')
    await expect(page).toHaveURL(/\/auth/)

    // Le formulaire de connexion doit etre present
    await expect(page.locator('body')).toContainText(
      /connecter|connexion|inscription|signup|sign in/i,
    )
  })

  test('Page 404 affiche un message', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist')
    // En SPA, le statut HTTP est 200 (index.html servi) : on verifie le contenu
    expect(response).toBeTruthy()
    await expect(page.locator('body')).toContainText(/introuvable|not found|404/i)
  })

  test('Page Privacy se charge', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('body')).toContainText(/confidentialite|privacy|politique/i)
  })

  test('Page Legal se charge', async ({ page }) => {
    await page.goto('/legal')
    await expect(page.locator('body')).toContainText(/mentions|legal|terms/i)
  })
})
