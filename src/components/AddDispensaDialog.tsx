import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Warehouse, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddDispensaDialogProps {
  onDispensaAdded: () => void;
}

const iconOptions = [
  { value: 'warehouse', label: 'Magazzino' },
  { value: 'package', label: 'Scatola' },
  { value: 'refrigerator', label: 'Frigo' },
  { value: 'home', label: 'Casa' },
];

export const AddDispensaDialog = ({ onDispensaAdded }: AddDispensaDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [icon, setIcon] = useState('warehouse');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
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

    setIsLoading(true);

    try {
      const { error } = await supabase.from('dispense').insert({
        name: name.trim(),
        location: location.trim() || null,
        icon,
        user_id: user.id,
        status: 'online',
        products_count: 0
      });

      if (error) throw error;

      toast({
        title: 'Dispensa aggiunta!',
        description: `"${name}" è stata creata con successo.`
      });

      setName('');
      setLocation('');
      setIcon('warehouse');
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
            <Label htmlFor="icon">Icona</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
