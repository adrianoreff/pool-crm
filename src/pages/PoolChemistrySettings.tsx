import { usePoolReadingDefinitions, usePoolDosageDefinitions, useSeedPoolDefaults } from '@/hooks/usePoolChemistry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlaskConical, Loader2 } from 'lucide-react';

export default function PoolChemistrySettings() {
  const { data: readings = [], isLoading: loadingR } = usePoolReadingDefinitions();
  const { data: dosages = [], isLoading: loadingD } = usePoolDosageDefinitions();
  const seedDefaults = useSeedPoolDefaults();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-primary" />
            Pool Chemistry
          </h1>
          <p className="text-muted-foreground">
            Configure readings and dosages technicians record on each visit (Skimmer-style).
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => seedDefaults.mutate()}
          disabled={seedDefaults.isPending}
        >
          {seedDefaults.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Reset to defaults
        </Button>
      </div>

      <Tabs defaultValue="readings">
        <TabsList>
          <TabsTrigger value="readings">Readings</TabsTrigger>
          <TabsTrigger value="dosages">Dosages</TabsTrigger>
        </TabsList>
        <TabsContent value="readings">
          <Card>
            <CardHeader><CardTitle>Water readings</CardTitle></CardHeader>
            <CardContent>
              {loadingR ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ul className="space-y-2">
                  {readings.map((r) => (
                    <li key={r.id} className="flex justify-between py-2 border-b">
                      <span>{r.label}</span>
                      <span className="text-muted-foreground">{r.unit || '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dosages">
          <Card>
            <CardHeader><CardTitle>Chemical dosages</CardTitle></CardHeader>
            <CardContent>
              {loadingD ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ul className="space-y-2">
                  {dosages.map((d) => (
                    <li key={d.id} className="flex justify-between py-2 border-b">
                      <span>{d.label}</span>
                      <span className="text-muted-foreground">
                        {d.unit || ''}{' '}
                        {Array.isArray(d.preset_values)
                          ? `(${(d.preset_values as string[]).join(', ')})`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
