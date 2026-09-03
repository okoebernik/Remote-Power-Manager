'use client';

import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface UserSelectProps {
  users: { id: number; username: string; role: 'admin' | 'user' }[];
  selectedUserId: number;
  label: string;
  roleLabels: { admin: string; user: string };
}

export function UserSelect({ users, selectedUserId, label, roleLabels }: UserSelectProps) {
  const router = useRouter();

  // Lets <SelectValue> show the label immediately on first render instead of the
  // raw id — without this, the popup's <SelectItem>s (where the label normally
  // comes from) aren't mounted yet until the dropdown is opened once.
  const items = Object.fromEntries(
    users.map((user) => [String(user.id), `${user.username} (${roleLabels[user.role]})`]),
  );

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="user_id">{label}</Label>
      <Select
        items={items}
        defaultValue={selectedUserId ? String(selectedUserId) : undefined}
        onValueChange={(value) => router.push(`/assignments?user_id=${value}`)}
      >
        <SelectTrigger id="user_id" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={String(user.id)}>
              {user.username} ({roleLabels[user.role]})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
