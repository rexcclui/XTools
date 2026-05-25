import { LightningElement, api } from 'lwc';

/**
 * orderSummary
 * Displays aggregate stats for all orders in the dashboard.
 * Pure presentational component — no Apex calls, no events fired.
 * All data received from parent orderDashboard via @api.
 */
export default class OrderSummary extends LightningElement {
    @api accountId;
    @api orders = [];

    get totalOrders() {
        return this.orders.length;
    }

    get pendingCount() {
        return this.orders.filter(o => o.Status__c === 'Pending').length;
    }

    get submittedCount() {
        return this.orders.filter(o => o.Status__c === 'Submitted').length;
    }

    get totalValue() {
        return this.orders.reduce((sum, o) => sum + (o.Total_Amount__c || 0), 0);
    }

    get formattedTotalValue() {
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD'
        }).format(this.totalValue);
    }

    get hasPending() {
        return this.pendingCount > 0;
    }
}
