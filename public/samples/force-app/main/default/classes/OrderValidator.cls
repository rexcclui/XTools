/**
 * OrderValidator
 * Validates an Order__c before submission.
 * Returns a ValidationResult containing all errors found.
 */
public with sharing class OrderValidator {

    public ValidationResult validate(Order__c order) {
        ValidationResult result = new ValidationResult();
        checkRequiredFields(order, result);
        checkOrderStatus(order, result);
        checkLineItems(order, result);
        checkAmount(order, result);
        return result;
    }

    private void checkRequiredFields(Order__c order, ValidationResult result) {
        if (String.isBlank(order.AccountId)) {
            result.addError('Account is required.');
        }
    }

    private void checkOrderStatus(Order__c order, ValidationResult result) {
        Set<String> submittableStatuses = new Set<String>{ 'Draft', 'Pending' };
        if (!submittableStatuses.contains(order.Status__c)) {
            result.addError('Only Draft or Pending orders can be submitted.');
        }
    }

    private void checkLineItems(Order__c order, ValidationResult result) {
        Integer count = [
            SELECT COUNT() FROM OrderItem__c WHERE Order__c = :order.Id
        ];
        if (count == 0) {
            result.addError('Order must have at least one line item.');
        }
    }

    private void checkAmount(Order__c order, ValidationResult result) {
        if (order.Total_Amount__c == null || order.Total_Amount__c <= 0) {
            result.addError('Order total must be greater than zero.');
        }
    }

    public class ValidationResult {
        public Boolean     isValid { get; private set; }
        public List<String> errors { get; private set; }

        public ValidationResult() {
            this.isValid = true;
            this.errors  = new List<String>();
        }

        public void addError(String message) {
            this.errors.add(message);
            this.isValid = false;
        }
    }
}
