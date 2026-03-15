-- AddForeignKey
ALTER TABLE "supplier_payout_requests" ADD CONSTRAINT "supplier_payout_requests_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
