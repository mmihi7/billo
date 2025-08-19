import { FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function EmptyState({ 
  title = 'No data available', 
  description = 'There is no data to display at the moment.',
  icon: Icon = FileText,
  className = ''
}) {
  return (
    <Card className={`text-center p-6 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Add a variant for error states
export function ErrorState({ title = 'Something went wrong', description, className = '' }) {
  return (
    <EmptyState 
      title={title}
      description={description || 'There was an error loading the data. Please try again later.'}
      icon={AlertCircle}
      className={`border-destructive/20 bg-destructive/5 ${className}`}
    />
  );
}
