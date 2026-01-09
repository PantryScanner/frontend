import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Warehouse, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/backend/client";
import { useAuth } from '@/contexts/AuthContext';
import { useActiveGroup } from '@/contexts/ActiveGroupContext';
import { useToast } from '@/hooks/use-toast';

interface AddDispensaDialogProps {
  onDispensaAdded: () => void;
}

const colorOptions = [
  { value: '#6366f1', label: 'Indaco' },
  { value: '#8b5cf6', label: 'Viola' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#ef4444', label: 'Rosso' },
  { value: '#f97316', label: 'Arancione' },
  { value: '#eab308', label: 'Giallo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blu' },
  { value: '#64748b', label: 'Grigio' },
];

export const AddDispensaDialog = ({ onDispensaAdded }: AddDispensaDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Il nome della dispensa è obbligatorio'
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Devi essere autenticato per aggiungere una dispensa'
      });
      return;
    }

    if (!activeGroup) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Devi selezionare un gruppo'
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('dispense').insert({
        name: name.trim(),
        location: location.trim() || null,
        color,
        user_id: user.id,
        group_id: activeGroup.id,
        products_count: 0
      });

      if (error) throw error;

      toast({
        title: 'Dispensa aggiunta!',
        description: `"${name}" è stata creata con successo.`
      });

      setName('');
      setLocation('');
      setColor('#6366f1');
      setOpen(false);
      onDispensaAdded();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile aggiungere la dispensa'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova Dispensa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Warehouse className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Nuova Dispensa</DialogTitle>
          <DialogDescription className="text-center">
            Aggiungi una nuova location per organizzare i tuoi prodotti
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Es. Dispensa Cucina"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Posizione</Label>
            <Input
              id="location"
              placeholder="Es. Piano Terra"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Colore</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === opt.value 
                      ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Aggiungi'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};