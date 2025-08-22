import React from 'react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';

const TermsAndConditions = ({ onAccept, onDecline }) => {
  return (
    <motion.div 
      className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-bold mb-4">Terms and Conditions</h2>
      
      <div className="prose max-h-[60vh] overflow-y-auto mb-6">
        <h3>1. Acceptance of Terms</h3>
        <p className="mb-4">
          By using our services, you agree to be bound by these terms and conditions. 
          Please read them carefully before proceeding.
        </p>

        <h3>2. Privacy Policy</h3>
        <p className="mb-4">
          We respect your privacy. Your personal information will be used in accordance with our 
          Privacy Policy. By using our services, you consent to such processing.
        </p>

        <h3>3. User Responsibilities</h3>
        <p className="mb-4">
          You agree to use our services only for lawful purposes and in a way that does not 
          infringe the rights of others or restrict their use of the services.
        </p>

        <h3>4. Service Modifications</h3>
        <p className="mb-4">
          We reserve the right to modify or discontinue our services at any time without notice.
        </p>

        <h3>5. Limitation of Liability</h3>
        <p>
          We shall not be liable for any indirect, incidental, special, or consequential damages 
          resulting from the use or inability to use our services.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-gray-200">
        <Button 
          variant="outline" 
          onClick={onDecline}
          className="w-full sm:w-auto"
        >
          Decline
        </Button>
        <Button 
          onClick={onAccept}
          className="w-full sm:w-auto"
        >
          I Accept
        </Button>
      </div>
    </motion.div>
  );
};

export default TermsAndConditions;
