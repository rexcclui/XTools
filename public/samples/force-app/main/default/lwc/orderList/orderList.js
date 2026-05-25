import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

/**
 * orderList
 * Displays a searchable, sortable list of orders.
 * Fires 'orderselect' event when a row is clicked.
 * Receives orders from parent orderDashboard via @api.
 */
export default class OrderList extends NavigationMixin(LightningElement) {
    @api orders = [];

    @track searchTerm     = '';
    @track sortField      = 'CreatedDate';
    @track sortDirection  = 'desc';

    get filteredOrders() {
        if (!this.searchTerm) return this.orders;
        const q = this.searchTerm.toLowerCase();
        return this.orders.filter(o =>
            o.Name.toLowerCase().includes(q) ||
            o.Status__c.toLowerCase().includes(q)
        );
    }

    get sortedOrders() {
        const dir = this.sortDirection === 'asc' ? 1 : -1;
        return [...this.filteredOrders].sort((a, b) =>
            a[this.sortField] > b[this.sortField] ? dir : -dir
        );
    }

    get hasOrders() {
        return this.sortedOrders.length > 0;
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
    }

    handleSortName() {
        this.toggleSort('Name');
    }

    handleSortDate() {
        this.toggleSort('CreatedDate');
    }

    handleSortStatus() {
        this.toggleSort('Status__c');
    }

    toggleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField     = field;
            this.sortDirection = 'asc';
        }
    }

    handleRowClick(event) {
        const orderId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('orderselect', {
            detail: { orderId }
        }));
    }
}
