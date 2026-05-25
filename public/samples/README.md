# Apex Flow — Sample Project

A demonstration project for [Apex Flow](https://apexflow.trendx.uk) showing an **Order Management** feature built with Salesforce Apex and LWC.

## What's included

```
force-app/main/default/
├── classes/
│   ├── OrderController.cls      ← @AuraEnabled entry point called by LWC
│   ├── OrderService.cls         ← Business logic, orchestrates everything
│   ├── OrderRepository.cls      ← Data layer, all SOQL queries
│   ├── PricingEngine.cls        ← Calculates totals, discounts, and tax
│   ├── NotificationService.cls  ← Sends order lifecycle emails
│   └── OrderValidator.cls       ← Validates orders before submission
└── lwc/
    ├── orderDashboard/          ← Root component, composes all child components
    ├── orderList/               ← Searchable and sortable order table
    ├── orderDetail/             ← Selected order detail with live pricing
    └── orderSummary/            ← Aggregate stats strip (pure presentational)
```

## How to use with Apex Flow

1. Open [apexflow.trendx.uk](https://apexflow.trendx.uk) in Chrome or Edge
2. Click **Open Folder** in the sidebar and select this `samples/` folder
3. The tool indexes all classes and LWC components automatically
4. The **Relationship Diagram** renders showing all dependencies between classes and components

## What to explore

### Relationship Diagram
- `orderDashboard` → `OrderController` (via `@salesforce/apex` imports)
- `orderDashboard` → `orderList`, `orderDetail`, `orderSummary` (via `<c-…>` HTML tags)
- `OrderController` → `OrderService`, `OrderValidator`, `PricingEngine`
- `OrderService` → `OrderRepository`, `PricingEngine`, `NotificationService`

### Analyze Flow
1. Click **Analyze Flow** on `OrderController` in the sidebar
2. Enable `submitOrder` in the method picker
3. See the full call chain: `submitOrder` → `getOrderById` → `validate` → `processOrder` → `calculateTotal` → `save` → `sendConfirmation`

### Dynamic Ad-hoc Loading
- Start with just `OrderController.cls` loaded
- Ghost nodes appear for `OrderService`, `PricingEngine`, etc.
- Right-click any ghost node → **Load Class** to expand the diagram

### Local Source Exploration
- Right-click any node → **View Source** to read the full Apex or LWC source
- Right-click any node → **View Code** to inspect a specific method body
