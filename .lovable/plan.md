
# Plano de Correção: Atalho /technician, Mapbox e Erros de Build

## Resumo dos Problemas Identificados

### 1. Falta de atalho para a página `/technician`
A página `/technician` existe e funciona, mas não há um link na sidebar principal para acessá-la. A sidebar atual só mostra links para as páginas do painel admin (Dashboard, Calendar, Appointments, etc.). 

Para acessar o painel do técnico, o usuário precisa digitar manualmente `/technician/dashboard` na URL ou fazer login como técnico.

### 2. Mapbox não carrega na página Service Areas
A página `ServiceAreas.tsx` está usando um componente `MapPlaceholder` estático em vez de integrar com o Mapbox. Mesmo com o token salvo em Settings, o mapa real não está sendo renderizado.

### 3. Erros de Build (TypeScript)
Há vários erros de TypeScript causados por:

| Erro | Causa |
|------|-------|
| `started_at`, `completed_at`, `time_spent_minutes`, `en_route_at`, `arrived_at` não existem | O arquivo `types.ts` está desatualizado - esses campos existem no banco mas não estão nos tipos TypeScript |
| Duplicate identifier `Mail` em `Team.tsx` | Import duplicado de `Mail` do lucide-react |
| `useEffect` não encontrado em `CompleteJob.tsx` | Falta import do `useEffect` |
| Comparação de tipos inválida em `ProtectedRoute.tsx` e `JobsList.tsx` | Comparação de status `'technician'` e `'confirmed'` que não existem nos tipos |

---

## Solução Proposta

### Parte 1: Adicionar Atalho para /technician na Sidebar

Adicionar um novo item na sidebar para usuários admin/owner acessarem o painel do técnico:

**Arquivo:** `src/components/layout/Sidebar.tsx`

```typescript
// Adicionar no final dos businessNavItems ou como uma nova seção
const adminToolsNavItems: NavItem[] = [
  { label: 'Tech Portal', href: '/technician/dashboard', icon: UserCog },
];
```

Ou alternativamente, adicionar um botão "View as Technician" na área de perfil da sidebar.

---

### Parte 2: Integrar Mapbox na página Service Areas

**Arquivos a modificar:**
- `src/pages/ServiceAreas.tsx`

**Implementação:**
1. Criar um componente `MapboxMap` que usa o token salvo no business
2. Substituir o `MapPlaceholder` pelo mapa real quando o token estiver configurado
3. Mostrar mensagem de configuração quando o token não existir

```typescript
function MapboxMap({ areas, token }: { areas: ServiceAreaWithTechnician[]; token: string }) {
  // Usar mapbox-gl ou react-map-gl para renderizar o mapa
  // Exibir as service areas como polígonos no mapa
}

// No componente principal:
const { data: business } = useBusiness();
const mapboxToken = business?.mapbox_public_token;

{mapboxToken ? (
  <MapboxMap areas={serviceAreas} token={mapboxToken} />
) : (
  <MapPlaceholder areas={serviceAreas} />
)}
```

**Nota:** Será necessário instalar a dependência `mapbox-gl` ou `react-map-gl`.

---

### Parte 3: Corrigir Erros de Build

#### 3.1 Atualizar tipos em `src/types/database.ts`

Adicionar os campos que faltam ao tipo `AppointmentWithRelations`:

```typescript
export type AppointmentWithRelations = Appointment & {
  customer: Customer;
  service: Service | null;
  technician: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'color'> | null;
  // Campos adicionais que existem no banco
  started_at?: string | null;
  completed_at?: string | null;
  time_spent_minutes?: number | null;
  en_route_at?: string | null;
  arrived_at?: string | null;
  work_summary?: string | null;
  technician_notes?: string | null;
};
```

#### 3.2 Corrigir import duplicado em `Team.tsx`

**Linha 6 e 61** - Remover o import duplicado:

```typescript
// Linha 6: Manter
import { Mail, /* outros */ } from 'lucide-react';

// Linha 61: Remover o import duplicado
// import { Mail, Clock, RefreshCw, X } from 'lucide-react'; // REMOVER
```

#### 3.3 Adicionar import useEffect em `CompleteJob.tsx`

**Linha 1-2:**
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react'; // Adicionar useEffect
```

#### 3.4 Corrigir comparação de tipos em `ProtectedRoute.tsx`

**Linha 38:** A comparação `profile.role !== 'technician'` está incorreta porque `allowedRoles` só contém `['owner', 'admin', 'dispatcher']`. Simplificar a lógica:

```typescript
// Remover a linha 38 ou ajustar a condição
if (profile.role === 'technician') {
  return <Navigate to="/technician/dashboard" replace />;
}
// Remover a verificação redundante da linha 38
```

#### 3.5 Corrigir comparação em `JobsList.tsx`

**Linha 64:** O status `'confirmed'` não existe no enum. Remover essa comparação:

```typescript
} else if (apt.status === 'scheduled') { // Remover || apt.status === 'confirmed'
  groups.scheduled.push(apt);
}
```

#### 3.6 Corrigir hook `useJobChecklist.ts`

O problema é que o Supabase client não está reconhecendo as tabelas `service_checklists` e `appointment_checklist_items`. Precisamos verificar se essas tabelas existem e adicionar os tipos corretos.

#### 3.7 Corrigir `useTechnicianAppointments.ts`

**Linha 34:** O filtro de status precisa usar o tipo correto:

```typescript
if (filters?.status) {
  query = query.eq('status', filters.status as Database['public']['Enums']['appointment_status']);
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/layout/Sidebar.tsx` | Adicionar link para Tech Portal |
| `src/pages/ServiceAreas.tsx` | Integrar Mapbox quando token disponível |
| `src/types/database.ts` | Adicionar campos extras ao `AppointmentWithRelations` |
| `src/pages/Team.tsx` | Remover import duplicado de `Mail` |
| `src/pages/technician/CompleteJob.tsx` | Adicionar import `useEffect` |
| `src/components/auth/ProtectedRoute.tsx` | Corrigir lógica de comparação de role |
| `src/pages/technician/JobsList.tsx` | Remover status 'confirmed' inválido |
| `src/hooks/useJobChecklist.ts` | Corrigir tipos do Supabase |
| `src/hooks/useTechnicianAppointments.ts` | Tipar corretamente o filtro de status |

---

## Dependências Necessárias

Para a integração completa do Mapbox, será necessário instalar:

```bash
npm install mapbox-gl
npm install --save-dev @types/mapbox-gl
```

Ou usar `react-map-gl` que é um wrapper React:

```bash
npm install react-map-gl mapbox-gl
```

---

## Ordem de Implementação

1. **Primeiro:** Corrigir todos os erros de build (tipos, imports duplicados)
2. **Segundo:** Adicionar atalho na sidebar para /technician
3. **Terceiro:** Integrar Mapbox na página Service Areas

---

## Observações Técnicas

- O arquivo `src/integrations/supabase/types.ts` é gerado automaticamente pelo Supabase e não deve ser editado manualmente. Os campos existem no banco mas os tipos não foram regenerados.
- A solução para os tipos é criar uma extensão no `src/types/database.ts` que adiciona os campos extras.
- O Mapbox Public Token é seguro para usar no frontend (é público por natureza).
