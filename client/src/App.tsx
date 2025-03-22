import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ProjectList from "@/pages/projects";
import ProjectDetails from "@/pages/projects/[id]";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import Portfolios from "@/pages/portfolios";
import AuthPage from "@/pages/auth";
import { useAuth } from "@/hooks/use-auth"; // Import useAuth
import AdminUsers from "@/pages/admin/users"; // Import AdminUsers component
import { Redirect } from "wouter";


function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="*">
        {() => (
          <Layout>
            <Switch>
              <ProtectedRoute path="/" component={Dashboard} />
              <ProtectedRoute path="/projects" component={ProjectList} />
              <ProtectedRoute path="/projects/:id" component={ProjectDetails} />
              <ProtectedRoute path="/portfolios" component={Portfolios} />
              <ProtectedRoute path="/team" component={Team} />
              <ProtectedRoute path="/settings" component={Settings} />
              {/* 管理者用ルートを追加 */}
              <ProtectedRoute
                path="/admin/users"
                component={() => {
                  const { isAdmin } = useAuth();
                  if (!isAdmin) {
                    return <Redirect to="/" />;
                  }
                  return <AdminUsers />;
                }}
              />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;