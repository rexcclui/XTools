/**
 * OrderService
 * Core business logic for order management.
 * Orchestrates OrderRepository, PricingEngine, and NotificationService.
 */
public with sharing class OrderService {

    private OrderRepository repository;
    private PricingEngine pricingEngine;
    private NotificationService notifier;

    public OrderService() {
        this.repository  = new OrderRepository();
        this.pricingEngine = new PricingEngine();
        this.notifier    = new NotificationService();
    }

    public List<Order__c> fetchOrdersByAccount(String accountId) {
        return repository.queryByAccount(accountId);
    }

    public Order__c getOrderById(String orderId) {
        return repository.findById(orderId);
    }

    public List<Order__c> getPendingOrders() {
        return repository.queryByStatus('Pending');
    }

    public OrderResult processOrder(Order__c order) {
        Decimal total = pricingEngine.calculateTotal(order.Id);
        order.Total_Amount__c = total;
        order.Status__c = 'Submitted';

        repository.save(order);
        notifier.sendConfirmation(order);

        return OrderResult.success(order);
    }

    public void cancelOrder(Order__c order) {
        String previousStatus = order.Status__c;
        order.Status__c = 'Cancelled';
        repository.save(order);
        notifier.sendStatusUpdate(order, previousStatus);
    }

    public List<Order__c> bulkProcess(List<String> orderIds) {
        List<Order__c> processed = new List<Order__c>();
        for (String id : orderIds) {
            Order__c order = repository.findById(id);
            OrderResult result = processOrder(order);
            if (result.success) {
                processed.add(result.order);
            }
        }
        repository.saveAll(processed);
        return processed;
    }

    public class OrderResult {
        public Boolean success  { get; private set; }
        public Order__c order   { get; private set; }
        public List<String> errors { get; private set; }

        private OrderResult() {}

        public static OrderResult success(Order__c order) {
            OrderResult r = new OrderResult();
            r.success = true;
            r.order   = order;
            r.errors  = new List<String>();
            return r;
        }

        public static OrderResult failure(List<String> errors) {
            OrderResult r = new OrderResult();
            r.success = false;
            r.errors  = errors;
            return r;
        }
    }
}
