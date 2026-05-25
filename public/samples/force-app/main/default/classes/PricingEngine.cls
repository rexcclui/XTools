/**
 * PricingEngine
 * Calculates order totals including line items, discounts, and tax.
 * Pure calculation class — no DML, no notifications.
 */
public with sharing class PricingEngine {

    private static final Decimal TAX_RATE           = 0.08;
    private static final Decimal DISCOUNT_THRESHOLD = 1000;
    private static final Decimal DISCOUNT_RATE      = 0.10;

    public Decimal calculateTotal(String orderId) {
        List<OrderItem__c> items = fetchLineItems(orderId);
        Decimal subtotal = calculateSubtotal(items);
        Decimal discount = applyVolumeDiscount(subtotal);
        Decimal tax      = calculateTax(subtotal - discount);
        return subtotal - discount + tax;
    }

    public Decimal calculateSubtotal(List<OrderItem__c> items) {
        Decimal total = 0;
        for (OrderItem__c item : items) {
            total += item.Quantity__c * item.Unit_Price__c;
        }
        return total;
    }

    public Decimal applyVolumeDiscount(Decimal subtotal) {
        if (subtotal >= DISCOUNT_THRESHOLD) {
            return subtotal * DISCOUNT_RATE;
        }
        return 0;
    }

    public Decimal calculateTax(Decimal amount) {
        return amount * TAX_RATE;
    }

    private List<OrderItem__c> fetchLineItems(String orderId) {
        return [
            SELECT Id, Quantity__c, Unit_Price__c, Product__c
            FROM OrderItem__c
            WHERE Order__c = :orderId
        ];
    }
}
