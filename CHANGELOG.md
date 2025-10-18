# Changelog - Corrections du système de balance checking

## Version 2024-10-18

### 🐛 Bugs corrigés

#### 1. Fallback des endpoints API ne fonctionnait pas correctement
**Problème** : Le système réessayait le même endpoint (mempool-space) 3 fois au lieu de basculer vers blockstream, blockchain.info, et blockcypher.

**Logs avant** :
```
attemptedEndpoints: ["mempool-space","mempool-space","mempool-space"]
lastError: "Request failed with status code 429"
```

**Logs après** :
```
attemptedEndpoints: ["mempool-space","blockstream","blockchain-info","blockcypher"]
```

**Solution** : Refactorisation de la méthode `checkBalance()` dans `api-router.ts` pour itérer séquentiellement sur tous les endpoints au lieu d'utiliser le round-robin.

**Fichiers modifiés** :
- `src/4-balance-checker/api-router.ts`

---

### ✨ Nouvelles fonctionnalités

#### 2. Support Bitcoin Core RPC
Ajout du support pour interroger directement un nœud Bitcoin Core local via RPC.

**Avantages** :
- Aucune limite de rate (queries illimitées)
- Latence faible (~10-50ms)
- Pas de dépendance aux APIs publiques
- Données 100% fiables de votre propre nœud

**Authentification supportée** :
- Cookie file (`.cookie`)
- Username/Password (RPC credentials)

**Nouveaux fichiers** :
- `src/4-balance-checker/bitcoin-rpc-client.ts`
- `config/bitcoin-sources.json` (configuration)

**Configuration** : Voir `BALANCE_CHECKER_SETUP.md`

---

#### 3. Support Electrum Protocol
Ajout du support pour se connecter à des serveurs Electrum (TCP/SSL).

**Avantages** :
- Protocole optimisé pour Bitcoin
- Plus rapide que les APIs REST
- Moins de rate limiting
- Support des serveurs publics et privés

**Serveurs publics supportés** :
- electrum.blockstream.info
- electrum.qtornado.com
- Et autres serveurs Electrum standards

**Nouveaux fichiers** :
- `src/4-balance-checker/electrum-client.ts`

**Configuration** : Voir `BALANCE_CHECKER_SETUP.md`

---

#### 4. Unified Balance Checker
Nouveau système unifié qui peut utiliser plusieurs sources avec fallback automatique.

**Sources supportées** (par ordre de priorité configurable) :
1. Bitcoin Core RPC (local)
2. Electrum servers
3. Public REST APIs

**Fonctionnalités** :
- Détection automatique des sources disponibles
- Fallback transparent si une source échoue
- Configuration flexible par priorité
- Monitoring de santé des sources

**Nouveaux fichiers** :
- `src/4-balance-checker/unified-balance-checker.ts`

---

#### 5. Configuration multi-sources
Nouveau fichier de configuration pour gérer différentes sources de données blockchain.

**Fichier** : `config/bitcoin-sources.json`

**Format** :
```json
{
  "sources": [
    {
      "type": "bitcoin-rpc",
      "enabled": true,
      "priority": 1,
      "config": { ... }
    },
    {
      "type": "electrum", 
      "enabled": false,
      "priority": 2,
      "config": { ... }
    },
    {
      "type": "api",
      "enabled": true,
      "priority": 3
    }
  ]
}
```

---

### 🔧 Améliorations techniques

#### 6. Worker amélioré avec détection automatique
Le worker détecte maintenant automatiquement la configuration disponible :
- Si `bitcoin-sources.json` existe avec RPC/Electrum → utilise `UnifiedBalanceChecker`
- Sinon → utilise `ApiRouter` (comportement par défaut)

**Fichiers modifiés** :
- `workers/seed-checker-worker.ts`

---

#### 7. Types améliorés
Ajout de nouveaux types TypeScript pour supporter les nouvelles fonctionnalités.

**Nouveaux types** :
- `BitcoinSourceConfig`
- Amélioration de `BalanceCheckResult` (ajout de `checkDuration`)

**Fichiers modifiés** :
- `src/types/index.ts`
- `src/utils/config.ts`

---

### 📚 Documentation

Nouveaux fichiers de documentation :
- `BALANCE_CHECKER_SETUP.md` - Guide complet de configuration
- `QUICK_FIX_SUMMARY.md` - Résumé des corrections
- `CHANGELOG.md` - Ce fichier

---

### ✅ Rétrocompatibilité

**Aucun breaking change** :
- L'application fonctionne toujours avec la configuration existante
- Le comportement par défaut (APIs publiques) est préservé
- Les nouvelles fonctionnalités sont optionnelles

**Migration** :
- Aucune migration requise
- Pour utiliser RPC/Electrum : créer `config/bitcoin-sources.json`

---

### 🧪 Tests

Pour tester les nouvelles fonctionnalités :

```bash
# Compiler
npm run build

# Test de configuration
npm run verify

# Lancer en dev
npm run dev
```

**Logs attendus** :

Avec APIs (défaut) :
```
Worker: Using API Router (public APIs)
API Router initialized
```

Avec RPC/Electrum :
```
Worker: Using Unified Balance Checker (with RPC/Electrum)
Bitcoin RPC initialized
Electrum initialized
Balance checker initialized
```

---

### 📊 Comparaison des performances

| Source | Vitesse | Rate Limit | Fiabilité | Coût |
|--------|---------|------------|-----------|------|
| Bitcoin Core RPC | ⭐⭐⭐⭐⭐ | ❌ Aucun | ⭐⭐⭐⭐⭐ | Gratuit (local) |
| Electrum (local) | ⭐⭐⭐⭐ | ❌ Aucun | ⭐⭐⭐⭐ | Gratuit (local) |
| Electrum (public) | ⭐⭐⭐ | ⚠️ Possible | ⭐⭐⭐ | Gratuit |
| APIs publiques | ⭐⭐ | ✅ Oui | ⭐⭐⭐ | Gratuit |

---

### 🎯 Recommandations

**Pour usage local/développement** :
→ Bitcoin Core RPC (si vous avez déjà un nœud)

**Pour production sans nœud** :
→ Configuration hybride : Electrum (public) + APIs en fallback

**Pour tests rapides** :
→ APIs publiques (configuration actuelle, maintenant corrigée)

---

### 🐛 Problèmes connus

1. **Electrum script hash** : L'implémentation actuelle du script hash est simplifiée. Pour une production, il faudrait utiliser bitcoinjs-lib pour la conversion correcte address → scripthash.

2. **Electrum reconnection** : Le client ne gère pas encore la reconnexion automatique en cas de déconnexion.

3. **Bitcoin Core import** : L'import d'adresse peut être lent sur la première utilisation si le nœud doit rescanner.

---

### 🔮 Futures améliorations possibles

- [ ] Support pour Esplora API
- [ ] Batch queries pour Bitcoin RPC
- [ ] Connection pooling pour Electrum
- [ ] Métriques détaillées par source
- [ ] Auto-detection du meilleur endpoint
- [ ] Circuit breaker pattern
- [ ] Retry avec exponential backoff configurable

---

## Crédits

Développé pour résoudre les problèmes de rate limiting et améliorer la résilience du système de récupération de seed Bitcoin.
