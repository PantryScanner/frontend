import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Mail, Loader2, Check, X, Warehouse } from 'lucide-react';
import { useActiveGroup, PendingInvite } from '@/contexts/ActiveGroupContext';
import { toast } from 'sonner';

export const GroupOnboarding = () => {
  const { pendingInvites, createGroup, acceptInvite, declineInvite, refreshInvites } = useActiveGroup();
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Inserisci un nome per il gruppo');
      return;
    }

    setIsCreating(true);
    const result = await createGroup(groupName.trim(), groupDesc.trim());
    setIsCreating(false);

    if (result) {
      toast.success('Gruppo creato con successo!');
    } else {
      toast.error('Errore nella creazione del gruppo');
    }
  };

  const handleAccept = async (invite: PendingInvite) => {
    setProcessingInvite(invite.id);
    const success = await acceptInvite(invite.id);
    setProcessingInvite(null);

    if (success) {
      toast.success(`Ti sei unito a "${invite.group_name}"`);
    } else {
      toast.error('Errore nell\'accettazione dell\'invito');
    }
  };

  const handleDecline = async (invite: PendingInvite) => {
    setProcessingInvite(invite.id);
    const success = await declineInvite(invite.id);
    setProcessingInvite(null);

    if (success) {
      toast.info('Invito rifiutato');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-lg space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Warehouse className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Benvenuto in PantryOS</h1>
          <p className="text-muted-foreground">
            Per iniziare, crea un gruppo o unisciti a uno esistente
          </p>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-primary" />
                Inviti in sospeso
              </CardTitle>
              <CardDescription>
                Sei stato invitato a unirti a questi gruppi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{invite.group_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs capitalize">
                        {invite.role}
                      </Badge>
                      {invite.invited_by_username && (
                        <span>da {invite.invited_by_username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(invite)}
                      disabled={processingInvite === invite.id}
                    >
                      {processingInvite === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invite)}
                      disabled={processingInvite === invite.id}
                    >
                      {processingInvite === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pendingInvites.length > 0 && (
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">oppure</span>
            <Separator className="flex-1" />
          </div>
        )}

        {/* Create Group */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Crea un nuovo gruppo
            </CardTitle>
            <CardDescription>
              Crea un gruppo per la tua famiglia o team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Nome del gruppo *</Label>
              <Input
                id="groupName"
                placeholder="es. Famiglia Rossi"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDesc">Descrizione (opzionale)</Label>
              <Input
                id="groupDesc"
                placeholder="es. Gestione dispensa di casa"
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Crea Gruppo
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
