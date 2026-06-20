-- Capture why a review request was actioned or dismissed when it is resolved.
ALTER TABLE "ReviewRequest" ADD COLUMN "resolutionNote" TEXT;
