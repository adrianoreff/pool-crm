

# Booking Widget - Plano de Implementação Completo

## Contexto

O script `<script src="https://tradeflow.app/widget.js" data-id="wgt_..."></script>` não funciona porque:
1. O arquivo `widget.js` não existe
2. A URL `https://tradeflow.app` não é a URL do projeto

A boa notícia é que toda a infraestrutura de backend já está pronta:
- `widget-config` - Edge function para buscar configuração
- `widget-availability` - Edge function para buscar horários disponíveis  
- `create-appointment` - Edge function para criar agendamentos
- Tabela `widget_config` com cores, textos e embed_code

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                     SITE DO CLIENTE                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ <script src="https://tradeflow-hub-87.lovable.app/       │   │
│  │          widget-loader.js" data-id="wgt_xxx"></script>   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Botão Flutuante "Book Now"                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │ click                             │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Modal de Booking                        │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Step 1: Selecionar Serviço                        │  │   │
│  │  │  Step 2: Escolher Data e Horário                   │  │   │
│  │  │  Step 3: Informações do Cliente                    │  │   │
│  │  │  Step 4: Confirmação                               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
│  widget-config ──► widget-availability ──► create-appointment    │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes a Criar

### 1. Widget Loader (`public/widget-loader.js`)
Script vanilla JavaScript que:
- Lê o `data-id` do script tag
- Injeta estilos CSS isolados
- Cria o botão flutuante
- Carrega o iframe do widget quando clicado

### 2. Página do Widget (`src/pages/BookingWidget.tsx`)
Página React standalone que:
- Funciona em modo iframe (sem header/sidebar)
- Recebe `embed_code` via URL params
- Implementa o wizard de 4 passos
- Comunica com as edge functions existentes

### 3. Rota Pública
Adicionar rota `/widget/:embedCode` que carrega o BookingWidget sem autenticação

### 4. Atualização do Settings
Corrigir a URL do embed code para usar a URL real do projeto publicado

---

## Detalhes Técnicos

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `public/widget-loader.js` | Script embeddable para sites externos |
| `src/pages/BookingWidget.tsx` | Componente React do wizard de booking |
| `src/components/widget/WidgetServiceSelect.tsx` | Step 1: Seleção de serviço |
| `src/components/widget/WidgetDateTimePicker.tsx` | Step 2: Data e horário |
| `src/components/widget/WidgetCustomerForm.tsx` | Step 3: Formulário do cliente |
| `src/components/widget/WidgetConfirmation.tsx` | Step 4: Confirmação |

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Adicionar rota pública `/widget/:embedCode` |
| `src/pages/Settings.tsx` | Atualizar URL do embed code |

---

## Widget Loader (public/widget-loader.js)

```javascript
// Self-executing function para evitar conflitos
(function() {
  // 1. Encontrar o script tag e pegar data-id
  var script = document.currentScript;
  var embedCode = script.getAttribute('data-id');
  
  // 2. Configurar URLs baseado no ambiente
  var WIDGET_URL = 'https://tradeflow-hub-87.lovable.app/widget/' + embedCode;
  var API_URL = 'https://rfbkwdpilwmdnaurlxhm.supabase.co/functions/v1';
  
  // 3. Buscar configuração do widget
  fetch(API_URL + '/widget-config?embed_code=' + embedCode)
    .then(r => r.json())
    .then(config => initWidget(config))
    .catch(err => console.error('Widget error:', err));
  
  function initWidget(config) {
    // 4. Injetar estilos CSS
    var styles = createStyles(config.appearance);
    document.head.appendChild(styles);
    
    // 5. Criar botão flutuante
    var button = createFloatingButton(config.appearance);
    document.body.appendChild(button);
    
    // 6. Criar modal container
    var modal = createModalContainer();
    document.body.appendChild(modal);
    
    // 7. Event listeners
    button.onclick = () => openModal(modal, WIDGET_URL);
  }
  
  // ... funções auxiliares
})();
```

---

## Booking Widget Page (BookingWidget.tsx)

### Fluxo do Wizard

```text
Step 1: SERVIÇO
├── Lista de serviços com nome, descrição, duração
├── Preço estimado (se configurado)
└── Botão "Continue"

Step 2: DATA E HORÁRIO  
├── Calendário para selecionar data
├── Grid de horários disponíveis (via widget-availability)
├── Mostra quantidade de técnicos disponíveis
└── Botões "Back" e "Continue"

Step 3: INFORMAÇÕES
├── Nome completo
├── Telefone
├── Email (opcional)
├── Endereço do serviço
├── Notas adicionais (opcional)
└── Botões "Back" e "Book Now"

Step 4: CONFIRMAÇÃO
├── Resumo do agendamento
├── Código de referência
├── Instruções próximos passos
└── Botão "Close" ou "Book Another"
```

### Estados do Componente

```typescript
interface WidgetState {
  step: 1 | 2 | 3 | 4;
  config: WidgetConfig | null;
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  customerInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    notes: string;
  };
  booking: BookingResult | null;
  isLoading: boolean;
  error: string | null;
}
```

---

## Fluxo de API Calls

```text
1. Página carrega
   └── GET /widget-config?embed_code=wgt_xxx
       └── Retorna: business, appearance, services, operatingHours, bookingRules

2. Usuário seleciona data
   └── POST /widget-availability
       Body: { embedCode, date, serviceId }
       └── Retorna: { date, slots: [{ time, available, techniciansAvailable }] }

3. Usuário submete booking
   └── POST /create-appointment
       Body: { embedCode, customer, serviceId, date, time, address, ... }
       └── Retorna: { success, appointment: { id, referenceCode, portalToken, ... } }
```

---

## Design do Widget

### Cores (Customizáveis via widget_config)
- **Primary**: `#F97316` (laranja)
- **Background**: `#FFFFFF`
- **Text**: `#0F172A`
- **Border**: `#E2E8F0`
- **Button Text**: `#FFFFFF`

### Responsividade
- Desktop: Modal de 480px de largura
- Mobile: Full screen

### Acessibilidade
- Focus states para navegação por teclado
- ARIA labels
- Contraste de cores adequado

---

## Atualização do Settings.tsx

O embed code atual usa `https://tradeflow.app` que não existe.

Correção:
```typescript
// Antes
value={`<script src="https://tradeflow.app/widget.js" data-id="${widgetConfig?.embed_code}"></script>`}

// Depois  
value={`<script src="https://tradeflow-hub-87.lovable.app/widget-loader.js" data-id="${widgetConfig?.embed_code}"></script>`}
```

Também adicionar:
- Preview ao vivo do widget
- Configuração de cores
- Customização do texto do botão

---

## Resumo dos Arquivos

### Novos (6 arquivos)
1. `public/widget-loader.js` - Script embeddable
2. `src/pages/BookingWidget.tsx` - Página principal do widget
3. `src/components/widget/WidgetServiceSelect.tsx` - Step 1
4. `src/components/widget/WidgetDateTimePicker.tsx` - Step 2
5. `src/components/widget/WidgetCustomerForm.tsx` - Step 3
6. `src/components/widget/WidgetConfirmation.tsx` - Step 4

### Modificados (2 arquivos)
1. `src/App.tsx` - Nova rota `/widget/:embedCode`
2. `src/pages/Settings.tsx` - URL correta + preview + copy funcional

---

## Resultado Final

Após implementação, o usuário poderá:

1. **No TradeFlow CRM**: Ir em Settings > Widget, ver o preview, copiar o código
2. **No site externo**: Colar o script tag
3. **Visitante do site**: Ver botão "Book Now", clicar, preencher wizard, agendar
4. **No TradeFlow CRM**: Ver o novo agendamento no Dashboard/Calendar

O embed code gerado será:
```html
<script src="https://tradeflow-hub-87.lovable.app/widget-loader.js" 
        data-id="wgt_f75f7fa4bcb438a36115c48f"></script>
```

