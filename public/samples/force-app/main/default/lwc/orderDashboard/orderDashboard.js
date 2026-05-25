import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOrders    from '@salesforce/apex/OrderController.getOrders';
import submitOrder  from '@salesforce/apex/OrderController.submitOrder';
import cancelOrder  from '@salesforce/apex/OrderController.cancelOrder';

/**
 * orderDashboard
 * Root component for the Order Management feature.
 * Composes orderSummary, orderList, and orderDetail as child components.
 * All Apex calls are made here and passed down via @api properties.
 */
export default class OrderDashboard extends NavigationMixin(LightningElement) {
    @api accountId;

    @track orders          = [];
    @track selectedOrderId = null;
    @track isLoading       = false;
    @track error           = null;

    @wire(getOrders, { accountId: '$accountId' })
    wiredOrders({ data, error }) {
        if (data) {
            this.orders = data;
            this.error  = null;
        } else if (error) {
            this.error = error.body.message;
        }
    }

    handleOrderSelect(event) {
        this.selectedOrderId = event.detail.orderId;
    }

    async handleSubmit(event) {
        this.isLoading = true;
        try {
            const result = await submitOrder({ orderId: event.detail.orderId });
            if (result.success) {
                this.showToast('Success', 'Order submitted successfully.', 'success');
                await this.refreshOrders();
            } else {
                this.showToast('Error', result.errors.join(', '), 'error');
            }
        } catch (e) {
            this.error = e.body.message;
        } finally {
            this.isLoading = false;
        }
    }

    async handleCancel(event) {
        this.isLoading = true;
        try {
            await cancelOrder({ orderId: event.detail.orderId });
            this.showToast('Cancelled', 'Order has been cancelled.', 'warning');
            this.selectedOrderId = null;
            await this.refreshOrders();
        } catch (e) {
            this.error = e.body.message;
        } finally {
            this.isLoading = false;
        }
    }

    async refreshOrders() {
        const data = await getOrders({ accountId: this.accountId });
        this.orders = data || [];
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get hasSelectedOrder() {
        return this.selectedOrderId != null;
    }
}
