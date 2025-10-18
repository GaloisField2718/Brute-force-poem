# Balance Checker Configuration

## Problème Résolu

✅ **Problème du fallback des API** : Le système essayait le même endpoint plusieurs fois au lieu de basculer vers d'autres endpoints.

✅ **Solution** : Correction de la logique de fallback + ajout de sources alternatives (Bitcoin Core RPC et Electrum).

---

## Configuration par défaut (APIs publiques)

Par défaut, le système utilise plusieurs APIs publiques avec fallback automatique :

1. **mempool.space** (priorité 1)
2. **blockstream.info** (priorité 2)
3. **blockchain.info** (priorité 3)
4. **blockcypher.com** (priorité 4)

Le système essaiera maintenant **chaque endpoint différent** au lieu de réessayer le même.

---

## Option 1 : Bitcoin Core RPC (Recommandé pour usage local)

Si vous avez Bitcoin Core installé localement, c'est la méthode **la plus rapide et sans limite de rate**.

### Configuration

1. **Éditer `config/bitcoin-sources.json`** :

```json
{
  "sources": [
    {
      "type": "bitcoin-rpc",
      "enabled": true,
      "priority": 1,
      "config": {
        "host": "127.0.0.1",
        "port": 8332,
        "cookiePath": "/home/bitcoin/.bitcoin/.cookie",
        "timeout": 30000
      }
    },
    {
      "type": "api",
      "enabled": true,
      "priority": 2,
      "comment": "Fallback to public APIs if RPC fails"
    }
  ]
}
```

2. **Trouver votre cookie Bitcoin Core** :

```bash
# Linux
~/.bitcoin/.cookie

# macOS
~/Library/Application Support/Bitcoin/.cookie

# Windows
%APPDATA%\Bitcoin\.cookie
```

3. **Alternative : Utiliser username/password** :

Si vous n'avez pas de cookie, configurez avec username/password :

```json
{
  "config": {
    "host": "127.0.0.1",
    "port": 8332,
    "username": "votre_rpc_user",
    "password": "votre_rpc_password",
    "timeout": 30000
  }
}
```

Ajoutez dans votre `bitcoin.conf` :
```
rpcuser=votre_rpc_user
rpcpassword=votre_rpc_password
server=1
```

### Avantages
- ✅ **Illimité** : Pas de rate limiting
- ✅ **Rapide** : Requêtes locales
- ✅ **Fiable** : Votre propre nœud
- ✅ **Privé** : Pas de requêtes externes

### Inconvénients
- ❌ Nécessite Bitcoin Core installé et synchronisé
- ❌ Utilise ~500 GB d'espace disque

---

## Option 2 : Electrum Server

Connectez-vous à un serveur Electrum pour des requêtes rapides sans limite.

### Configuration

Éditez `config/bitcoin-sources.json` :

```json
{
  "sources": [
    {
      "type": "electrum",
      "enabled": true,
      "priority": 1,
      "config": {
        "host": "electrum.blockstream.info",
        "port": 50002,
        "protocol": "ssl",
        "timeout": 10000
      }
    },
    {
      "type": "api",
      "enabled": true,
      "priority": 2,
      "comment": "Fallback to APIs"
    }
  ]
}
```

### Serveurs Electrum publics

| Serveur | Host | Port | Protocol |
|---------|------|------|----------|
| Blockstream | electrum.blockstream.info | 50002 | ssl |
| Electrum.org | electrum.qtornado.com | 50002 | ssl |
| Bitaroo | btc.usebsv.com | 50002 | ssl |

### Serveur Electrum local

Si vous avez votre propre serveur Electrum :

```json
{
  "host": "127.0.0.1",
  "port": 50001,
  "protocol": "tcp"
}
```

### Avantages
- ✅ Plus rapide que les APIs REST
- ✅ Moins de rate limiting
- ✅ Protocole optimisé pour Bitcoin

### Inconvénients
- ⚠️ Les serveurs publics peuvent avoir des limites
- ⚠️ Nécessite un serveur Electrum personnel pour usage intensif

---

## Option 3 : Configuration hybride (Recommandé)

Combinez plusieurs sources pour une résilience maximale :

```json
{
  "sources": [
    {
      "type": "bitcoin-rpc",
      "enabled": true,
      "priority": 1,
      "config": {
        "host": "127.0.0.1",
        "port": 8332,
        "cookiePath": "/home/bitcoin/.bitcoin/.cookie"
      },
      "comment": "Priorité 1 : Bitcoin Core local"
    },
    {
      "type": "electrum",
      "enabled": true,
      "priority": 2,
      "config": {
        "host": "electrum.blockstream.info",
        "port": 50002,
        "protocol": "ssl"
      },
      "comment": "Priorité 2 : Electrum en fallback"
    },
    {
      "type": "api",
      "enabled": true,
      "priority": 3,
      "comment": "Priorité 3 : APIs publiques en dernier recours"
    }
  ]
}
```

---

## Test de configuration

Vérifiez que votre configuration fonctionne :

```bash
npm run verify
```

---

## Dépannage

### Bitcoin Core RPC

**Erreur : Connection refused**
- Vérifiez que Bitcoin Core est démarré
- Vérifiez `server=1` dans `bitcoin.conf`
- Redémarrez Bitcoin Core

**Erreur : Authentication failed**
- Vérifiez le chemin du cookie
- Ou vérifiez username/password dans `bitcoin.conf`

**Erreur : RPC HTTP 403**
- Ajoutez `rpcallowip=127.0.0.1` dans `bitcoin.conf`

### Electrum

**Erreur : Connection timeout**
- Vérifiez que le serveur est accessible
- Testez avec telnet : `telnet host port`
- Essayez un autre serveur

**Erreur : SSL/TLS error**
- Changez `protocol` de `ssl` à `tcp`
- Ou utilisez un serveur différent

### APIs publiques

**Erreur : 429 Too Many Requests**
- Les APIs publiques ont des limites strictes
- Utilisez Bitcoin RPC ou Electrum à la place
- Attendez quelques minutes avant de réessayer

---

## Performances comparées

| Source | Requêtes/sec | Latence | Rate Limiting |
|--------|--------------|---------|---------------|
| Bitcoin Core RPC | **Illimité** | ~10-50ms | ❌ Non |
| Electrum (local) | ~100-200 | ~20-100ms | ❌ Non |
| Electrum (public) | ~10-50 | ~100-300ms | ⚠️ Possible |
| APIs publiques | ~1-3 | ~200-1000ms | ✅ Oui |

**Recommandation** : Bitcoin Core RPC > Electrum local > Electrum public > APIs publiques

---

## Migration

Si vous avez déjà `.env` configuré, **rien à changer** ! Le système fonctionne toujours avec les APIs publiques par défaut.

Pour activer RPC ou Electrum :
1. Créez `config/bitcoin-sources.json`
2. Configurez vos sources
3. Redémarrez l'application

Le système détectera automatiquement la nouvelle configuration.
