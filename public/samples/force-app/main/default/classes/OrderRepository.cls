/**
 * OrderRepository
 * Data access layer — all SOQL queries for Order__c live here.
 * Never called directly from LWC; always accessed through OrderService.
 */
public with sharing class OrderRepository {

    public List<Order__c> queryByAccount(String accountId) {
        return [
            SELECT Id, Name, Status__c, Total_Amount__c, CreatedDate, AccountId
            FROM Order__c
            WHERE AccountId = :accountId
            ORDER BY CreatedDate DESC
        ];
    }

    public List<Order__c> queryByStatus(String status) {
        return [
            SELECT Id, Name, Status__c, Total_Amount__c, AccountId
            FROM Order__c
            WHERE Status__c = :status
            ORDER BY CreatedDate ASC
        ];
    }

    public Order__c findById(String orderId) {
        List<Order__c> results = [
            SELECT Id, Name, Status__c, Total_Amount__c, AccountId, Description__c
            FROM Order__c
            WHERE Id = :orderId
            LIMIT 1
        ];
        if (results.isEmpty()) {
            throw new OrderNotFoundException('Order not found: ' + orderId);
        }
        return results[0];
    }

    public void save(Order__c order) {
        upsert order;
    }

    public void saveAll(List<Order__c> orders) {
        upsert orders;
    }

    public void deleteOrder(String orderId) {
        Order__c order = findById(orderId);
        delete order;
    }

    public class OrderNotFoundException extends Exception {}
}
