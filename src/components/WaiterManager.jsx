import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Plus, Trash2, User, KeyRound } from 'lucide-react'
import { createWaiter, subscribeToWaiters, deleteWaiter } from '../lib/database'

function WaiterManager({ restaurant }) {
  const [waiters, setWaiters] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWaiter, setNewWaiter] = useState({ name: '', pin: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!restaurant?.id) return
    const unsubscribe = subscribeToWaiters(restaurant.id, setWaiters)
    return () => unsubscribe()
  }, [restaurant?.id])

  const handleAddWaiter = async () => {
    if (!newWaiter.name.trim() || !/^\d{4}$/.test(newWaiter.pin)) {
      setError('Please enter a name and a 4-digit PIN.')
      return
    }
    setError('')
    try {
      await createWaiter({
        ...newWaiter,
        restaurantId: restaurant.id,
      })
      setNewWaiter({ name: '', pin: '' })
      setShowAddForm(false)
    } catch (err) {
      setError('Failed to add waiter. Please try again.')
    }
  }

  const handleDeleteWaiter = async (waiterId) => {
    if (confirm('Are you sure you want to remove this waiter?')) {
      await deleteWaiter(waiterId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Manage Waiters</h3>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {showAddForm ? 'Cancel' : 'Add Waiter'}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Waiter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="waiterName">Waiter Name</Label>
                <Input
                  id="waiterName"
                  value={newWaiter.name}
                  onChange={(e) => setNewWaiter({ ...newWaiter, name: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <Label htmlFor="waiterPin">4-Digit PIN</Label>
                <Input
                  id="waiterPin"
                  type="password"
                  maxLength="4"
                  value={newWaiter.pin}
                  onChange={(e) => setNewWaiter({ ...newWaiter, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g., 1234"
                />
              </div>
            </div>
            <Button onClick={handleAddWaiter}>Add Waiter</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {waiters.map((waiter) => (
          <Card key={waiter.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{waiter.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KeyRound className="w-4 h-4" />
                  <span>PIN: {waiter.pin}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteWaiter(waiter.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default WaiterManager