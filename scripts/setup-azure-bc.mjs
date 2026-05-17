/**
 * Script de configuration automatique : Azure AD App Registration pour Business Central
 * Usage : node scripts/setup-azure-bc.mjs
 */

const TENANT = 'FIRMEJBC.ONMICROSOFT.COM';
const CLI_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46'; // Azure CLI public client

// BC API identifiers (Dynamics 365 Business Central)
const BC_API_APP_ID = '996def3d-b36c-4153-8607-a36e3dd434ff';

// ──────────────────────────────────────────────
// Auth : Device Code Flow
// ──────────────────────────────────────────────
async function getDeviceCode() {
  const resp = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLI_CLIENT_ID,
        scope: 'https://graph.microsoft.com/.default offline_access',
      }).toString(),
    }
  );
  const data = await resp.json();
  if (!data.device_code) throw new Error(JSON.stringify(data));
  return data;
}

async function pollForToken(deviceCode, interval) {
  console.log('\n⏳ En attente de l\'authentification...');
  let attempts = 0;
  while (attempts < 180) { // 15 minutes max
    await new Promise((r) => setTimeout(r, (interval || 5) * 1000));
    attempts++;
    try {
      const resp = await fetch(
        `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            client_id: CLI_CLIENT_ID,
            device_code: deviceCode,
          }).toString(),
        }
      );
      const data = await resp.json();
      if (data.access_token) {
        console.log('\n✅ Authentification réussie!\n');
        return data.access_token;
      }
      if (data.error === 'authorization_pending') {
        process.stdout.write('.');
        continue;
      }
      if (data.error === 'slow_down') {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (data.error === 'expired_token') throw new Error('Code expiré. Relancez le script.');
      throw new Error(`Erreur auth: ${data.error} — ${data.error_description}`);
    } catch (e) {
      if (e.message.includes('expired') || e.message.includes('Erreur auth')) throw e;
      // Réseau temporairement indisponible — on réessaie
      process.stdout.write('r');
      continue;
    }
  }
  throw new Error('Timeout : aucune authentification après 15 minutes. Relancez le script.');
}

// ──────────────────────────────────────────────
// Graph API helpers
// ──────────────────────────────────────────────
async function graphReq(method, token, path, body, retries = 4) {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (method === 'PATCH' && resp.ok) return;
      const data = await resp.json();
      if (!resp.ok) throw new Error(`${method} ${path} → ${resp.status}: ${JSON.stringify(data)}`);
      return data;
    } catch (e) {
      if (e.message.includes('→') || i === retries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      process.stdout.write('↺');
    }
  }
}

const graphGet = (token, path) => graphReq('GET', token, path);
const graphPost = (token, path, body) => graphReq('POST', token, path, body);
const graphPatch = (token, path, body) => graphReq('PATCH', token, path, body);

// ──────────────────────────────────────────────
// Business Central : trouver le servicePrincipal BC
// ──────────────────────────────────────────────
async function getBCServicePrincipal(token) {
  // Chercher le SP de Dynamics 365 BC
  const result = await graphGet(
    token,
    `/servicePrincipals?$filter=appId eq '${BC_API_APP_ID}'&$select=id,appId,displayName,appRoles,oauth2PermissionScopes`
  );
  if (result.value && result.value.length > 0) {
    return result.value[0];
  }

  // Fallback: chercher par nom
  const byName = await graphGet(
    token,
    `/servicePrincipals?$filter=startswith(displayName,'Dynamics 365 Business Central')&$select=id,appId,displayName,appRoles`
  );
  if (byName.value && byName.value.length > 0) {
    return byName.value[0];
  }
  return null;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('=======================================================');
  console.log('  Configuration Azure AD pour Business Central (DSF)   ');
  console.log('=======================================================\n');

  // 1. Authentification
  console.log('📋 Étape 1 : Authentification Azure AD\n');
  const codeData = await getDeviceCode();

  // Ouvrir le navigateur automatiquement et copier le code
  const { execSync } = await import('child_process');
  try {
    execSync(`powershell.exe -c "Set-Clipboard '${codeData.user_code}'"`, { stdio: 'ignore' });
    execSync(`powershell.exe -c "Start-Process '${codeData.verification_uri}'"`, { stdio: 'ignore' });
  } catch (_) { /* ignore si powershell non disponible */ }

  console.log('════════════════════════════════════════════');
  console.log('  ✅ Navigateur ouvert automatiquement!');
  console.log('  ✅ Code copié dans le presse-papiers!');
  console.log('');
  console.log('  🔑 Code (aussi dans presse-papiers) :');
  console.log(`     >>> ${codeData.user_code} <<<`);
  console.log('');
  console.log('  👉 Colle-le (Ctrl+V) dans le champ');
  console.log(`     et connecte-toi avec JulienBeaulieu@FirmeJBC...`);
  console.log('════════════════════════════════════════════\n');

  const token = await pollForToken(codeData.device_code, codeData.interval || 5);

  // 2. Vérifier l'identité
  const me = await graphGet(token, '/me?$select=displayName,userPrincipalName');
  console.log(`👤 Connecté en tant que : ${me.displayName} (${me.userPrincipalName})\n`);

  // 3. Créer l'App Registration
  console.log('📋 Étape 2 : Création de l\'inscription d\'application...');
  const newApp = await graphPost(token, '/applications', {
    displayName: 'DSF Website BC Integration',
    signInAudience: 'AzureADMyOrg',
    requiredResourceAccess: [],
  });
  console.log(`✅ Application créée : ${newApp.displayName}`);
  console.log(`   Client ID (AppId) : ${newApp.appId}`);
  console.log(`   Object ID         : ${newApp.id}\n`);

  // 4. Créer un Service Principal pour l'app
  console.log('📋 Étape 3 : Création du Service Principal...');
  const sp = await graphPost(token, '/servicePrincipals', {
    appId: newApp.appId,
  });
  console.log(`✅ Service Principal créé : ${sp.id}\n`);

  // 5. Trouver BC Service Principal & ajouter permissions
  console.log('📋 Étape 4 : Configuration des permissions Business Central...');
  const bcSP = await getBCServicePrincipal(token);

  let bcPermissionsAdded = false;
  if (bcSP) {
    console.log(`   BC Service Principal trouvé : ${bcSP.displayName} (${bcSP.id})`);

    // Trouver l'appRole API.ReadWrite.All dans BC
    const apiRole = bcSP.appRoles?.find(
      (r) => r.value === 'API.ReadWrite.All' || r.displayName?.includes('ReadWrite')
    );

    if (apiRole) {
      console.log(`   AppRole trouvé : ${apiRole.displayName} (${apiRole.id})`);

      // Ajouter la permission à l'app registration
      await graphPatch(token, `/applications/${newApp.id}`, {
        requiredResourceAccess: [
          {
            resourceAppId: bcSP.appId,
            resourceAccess: [
              { id: apiRole.id, type: 'Role' },
            ],
          },
        ],
      });

      // Grant admin consent
      try {
        await graphPost(token, '/oauth2PermissionGrants', {
          clientId: sp.id,
          consentType: 'AllPrincipals',
          resourceId: bcSP.id,
          scope: '',
        });
      } catch (e) {
        // Ignorer — le grant se fait via appRoleAssignments pour les app permissions
      }

      // Assign app role
      await graphPost(token, `/servicePrincipals/${sp.id}/appRoleAssignments`, {
        principalId: sp.id,
        resourceId: bcSP.id,
        appRoleId: apiRole.id,
      });

      console.log('✅ Permission API.ReadWrite.All accordée\n');
      bcPermissionsAdded = true;
    } else {
      console.log('⚠️  AppRole API.ReadWrite.All non trouvé automatiquement.');
      console.log('   Les permissions BC devront être ajoutées manuellement.\n');
    }
  } else {
    console.log('⚠️  Service Principal BC non trouvé dans ce tenant.');
    console.log('   (Normal si BC n\'est pas encore provisionné dans Azure AD)\n');
  }

  // 6. Créer un secret client
  console.log('📋 Étape 5 : Création du Client Secret...');
  const secretResp = await graphPost(token, `/applications/${newApp.id}/addPassword`, {
    passwordCredential: {
      displayName: 'DSF Website Secret',
      endDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 ans
    },
  });
  const clientSecret = secretResp.secretText;
  console.log(`✅ Secret créé (valable 2 ans)\n`);

  // 7. Obtenir le Tenant ID
  const org = await graphGet(token, '/organization?$select=id,displayName,verifiedDomains');
  const tenantId = org.value[0]?.id;

  // ──────────────────────────────────────────────
  // Résumé final
  // ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ CONFIGURATION TERMINÉE — Copie ces valeurs dans .env  ');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('BC_TENANT_ID=' + tenantId);
  console.log('BC_CLIENT_ID=' + newApp.appId);
  console.log('BC_CLIENT_SECRET=' + clientSecret);
  console.log('BC_ENVIRONMENT=sandbox');
  console.log('BC_COMPANY_ID=<à_récupérer_depuis_BC>');
  console.log('\n═══════════════════════════════════════════════════════════');

  if (!bcPermissionsAdded) {
    console.log('\n⚠️  ÉTAPES MANUELLES RESTANTES :');
    console.log('   1. Dans Azure Portal → Inscriptions d\'applications → DSF Website BC Integration');
    console.log('   2. Autorisations API → Ajouter → "Dynamics 365 Business Central"');
    console.log('   3. Sélectionner : API.ReadWrite.All (permission d\'application)');
    console.log('   4. Accorder consentement administrateur');
  }

  console.log('\n📌 PROCHAINES ÉTAPES :');
  console.log('   1. Connecte-toi à Business Central');
  console.log('   2. Admin → Applications Microsoft Entra');
  console.log('   3. Ajoute le Client ID : ' + newApp.appId);
  console.log('   4. Récupère l\'ID de compagnie depuis BC (Settings → Company Information)');
  console.log('   5. Mets à jour .env.local et Vercel avec les valeurs ci-dessus\n');
}

main().catch((err) => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});
