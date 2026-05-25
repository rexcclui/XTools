/**
 * NotificationService
 * Sends email notifications for order lifecycle events.
 * Called by OrderService — never directly from controllers.
 */
public with sharing class NotificationService {

    public void sendConfirmation(Order__c order) {
        String subject = buildConfirmationSubject(order);
        String body    = buildConfirmationBody(order);
        sendEmail(order.AccountId, subject, body);
    }

    public void sendStatusUpdate(Order__c order, String previousStatus) {
        String subject = 'Order Status Update: ' + order.Name;
        String body    = buildStatusBody(order, previousStatus);
        sendEmail(order.AccountId, subject, body);
    }

    public void sendCancellation(Order__c order) {
        String subject = 'Order Cancelled: ' + order.Name;
        String body    = 'Your order ' + order.Name + ' has been cancelled.';
        sendEmail(order.AccountId, subject, body);
    }

    private String buildConfirmationSubject(Order__c order) {
        return 'Order Confirmation: ' + order.Name;
    }

    private String buildConfirmationBody(Order__c order) {
        return 'Thank you! Order ' + order.Name
            + ' has been submitted. Total: $' + order.Total_Amount__c;
    }

    private String buildStatusBody(Order__c order, String previousStatus) {
        return 'Order ' + order.Name
            + ' status changed from ' + previousStatus
            + ' to ' + order.Status__c + '.';
    }

    private void sendEmail(String accountId, String subject, String body) {
        List<Account> accounts = [
            SELECT Id, PersonEmail FROM Account WHERE Id = :accountId LIMIT 1
        ];
        if (accounts.isEmpty() || String.isBlank(accounts[0].PersonEmail)) return;

        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new List<String>{ accounts[0].PersonEmail });
        email.setSubject(subject);
        email.setPlainTextBody(body);
        Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ email });
    }
}
