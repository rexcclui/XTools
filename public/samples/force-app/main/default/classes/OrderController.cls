/**
 * OrderController
 * Apex controller exposed to LWC via @AuraEnabled methods.
 * Entry point for the order management feature.
 * Delegates all business logic to OrderService.
 */
public with sharing class OrderController {

    @AuraEnabled(cacheable=true)
    public static List<Order__c> getOrders(String accountId) {
        OrderService service = new OrderService();
        return service.fetchOrdersByAccount(accountId);
    }

    @AuraEnabled(cacheable=true)
    public static Order__c getOrderById(String orderId) {
        OrderService service = new OrderService();
        return service.getOrderById(orderId);
    }

    @AuraEnabled
    public static OrderService.OrderResult submitOrder(String orderId) {
        OrderService service = new OrderService();
        OrderValidator validator = new OrderValidator();

        Order__c order = service.getOrderById(orderId);
        OrderValidator.ValidationResult validation = validator.validate(order);

        if (!validation.isValid) {
            return OrderService.OrderResult.failure(validation.errors);
        }

        return service.processOrder(order);
    }

    @AuraEnabled(cacheable=true)
    public static Decimal calculatePrice(String orderId) {
        PricingEngine engine = new PricingEngine();
        return engine.calculateTotal(orderId);
    }

    @AuraEnabled
    public static void cancelOrder(String orderId) {
        OrderService service = new OrderService();
        NotificationService notifier = new NotificationService();

        Order__c order = service.getOrderById(orderId);
        service.cancelOrder(order);
        notifier.sendCancellation(order);
    }
}
