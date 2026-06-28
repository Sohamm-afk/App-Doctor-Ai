import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* Big 404 */}
        <div className="font-heading text-[120px] font-bold leading-none gradient-text-primary mb-4">
          404
        </div>
        <h1 className="font-heading text-h2 text-text mb-3">Page not found</h1>
        <p className="text-body-md text-text-muted mb-8">
          The page you're looking for doesn't exist, or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Home size={16} />}
          >
            <Link to="/">Go Home</Link>
          </Button>
          <Button
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
