import { LightningElement, api, wire, track } from 'lwc';
import calculatePrice from '@salesforce/apex/OrderController.calculatePrice';

/**
 * orderDetail
 * Shows the full detail of a selected order including a live price calculation.
 * Calls OrderController.calculatePrice directly via @wire.
 * Fires 'submit' and 'cancel' events up to orderDashboard.
 */
export default class OrderDetail extends LightningElement {
    @api orderId;

    @track calculatedPrice = null;
    @track isSubmitting    = false;

    @wire(calculatePrice, { orderId: '$orderId' })
    wiredPrice({ data, error }) {
        if (data !== undefined) {
            this.calculatedPrice = data;
        } else if (error) {
            this.calculatedPrice = null;
        }
    }

    handleSubmit() {
        this.isSubmitting = true;
        this.dispatchEvent(new CustomEvent('submit', {
            detail: { orderId: this.orderId }
        }));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel', {
            detail: { orderId: this.orderId }
        }));
    }

    get formattedPrice() {
        if (this.calculatedPrice === null) return 'Calculating…';
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD'
        }).format(this.calculatedPrice);
    }

    get isSubmitDisabled() {
        return this.isSubmitting || this.calculatedPrice === null;
    }
}
