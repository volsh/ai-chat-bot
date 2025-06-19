import { useAppStore } from "@/state";

export default function MePage() {
  const { userProfile, loadingProfile } = useAppStore();

  if (loadingProfile) return <p>Loading profile…</p>;
  if (!userProfile) return <p>Not logged in</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Your Profile</h1>
      {userProfile ? <pre>{JSON.stringify(userProfile, null, 2)}</pre> : <p>Loading...</p>}
    </div>
  );
}
