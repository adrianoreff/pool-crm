

# Plano: Corrigir Push Notifications (VAPID 403)

## Problema Identificado

O erro `403 - VAPID credentials do not correspond` acontece porque:

1. A subscription foi criada com uma **VAPID key diferente** da atual
2. O Push Service (Google FCM) **cache-a** a associação entre endpoint e VAPID key
3. Mesmo recriando a subscription, o FCM pode recusar se o endpoint ainda existe com a key antiga

## Solução

### Etapa 1: Limpar TODAS as subscriptions do banco

Deletar todas as subscriptions existentes para forçar uma reinicialização completa.

```sql
DELETE FROM push_subscriptions;
```

### Etapa 2: Gerar um par VAPID NOVO e consistente

Vou gerar um novo par de chaves VAPID e:
- Atualizar o secret `VAPID_PUBLIC_KEY` no Supabase
- Atualizar o secret `VAPID_PRIVATE_KEY` no Supabase  
- Atualizar a constante `VAPID_PUBLIC_KEY` no frontend (`src/hooks/usePushNotifications.ts`)

**Geração de chaves** (exemplo usando web-push):
```javascript
const webPush = require('web-push');
const vapidKeys = webPush.generateVAPIDKeys();
console.log('Public:', vapidKeys.publicKey);
console.log('Private:', vapidKeys.privateKey);
```

### Etapa 3: Forçar Unsubscribe completo no navegador

Modificar o hook para:
1. Quando o usuário ativar notificações, primeiro **unsubscribe** de QUALQUER subscription existente no navegador
2. Só então criar uma nova subscription com a nova VAPID key
3. Isso garante que o navegador obtém um **novo endpoint** do FCM

```typescript
// No subscribe():
// 1. Unsubscribe forçado de qualquer subscription existente
const registration = await navigator.serviceWorker.register('/sw-push.js');
const existing = await registration.pushManager.getSubscription();
if (existing) {
  await existing.unsubscribe(); // Força o browser a pedir um NOVO endpoint
}

// 2. Limpa do banco qualquer subscription deste usuário
await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

// 3. Agora cria uma subscription NOVA com a VAPID key atual
const subscription = await registration.pushManager.subscribe({...});
```

### Etapa 4: Adicionar logs de diagnóstico no frontend

Mostrar qual VAPID key está sendo usada ao inscrever, para validar que está usando a correta.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.ts` | Atualizar VAPID_PUBLIC_KEY + forçar unsubscribe completo antes de subscribe |

## Ações Manuais Necessárias

1. **Atualizar Supabase Secrets** com o novo par VAPID (você precisará fornecer as novas chaves ou gerar com web-push)
2. **Limpar a tabela** `push_subscriptions` no Supabase SQL Editor
3. **Testar** ativando notificações novamente

---

## Detalhes Técnicos

### Por que o erro 403 persiste mesmo recriando?

Quando você chama `pushManager.subscribe()` com uma `applicationServerKey`, o navegador pode:
- Reutilizar o mesmo `endpoint` se ainda tiver uma subscription ativa
- O FCM valida que o `endpoint` foi criado com aquela VAPID key específica

Se a VAPID key mudou, o FCM rejeita com 403 porque o endpoint foi originalmente registrado com outra key.

### Solução definitiva

Ao fazer `existing.unsubscribe()` ANTES de criar uma nova subscription, forçamos o navegador a:
1. Invalidar o endpoint antigo
2. Criar um endpoint completamente novo
3. Registrar esse novo endpoint com a VAPID key atual

Isso "reseta" a associação no FCM e resolve o problema de forma definitiva.

