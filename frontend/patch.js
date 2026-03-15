const fs = require('fs');
const file = './src/pages/OrgPosts.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variables
content = content.replace(
  "const [errorMsg, setErrorMsg] = useState('');",
  "const [errorMsg, setErrorMsg] = useState('');\n  \n  // Filtering and Searching State\n  const [searchTerm, setSearchTerm] = useState('');\n  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Active', 'Pending', 'Revoked'"
);

// 2. Add filter logic before return
content = content.replace(
  "  return (",
  `  // Helper to determine status for filtering
  const getPostStatus = (post) => {
      if (post.any_revoked) return 'Revoked';
      if (!post.all_confirmed) return 'Pending';
      return 'Active';
  };

  // Filter Logic
  const filteredPosts = posts.filter(post => {
      const matchesSearch = 
        post.post_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        post.holder_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || getPostStatus(post) === statusFilter;

      return matchesSearch && matchesStatus;
  });

  return (`
);

// 3. Update Manage Vault Header text
content = content.replace(
  "<p className=\"text-slate-400 text-lg\">View, edit, or revoke issued document batches.</p>",
  "<p className=\"text-slate-400 text-lg\">View, filter, edit, or revoke issued document batches.</p>"
);

// 4. Update margin bottom of Wallet Connection Banner
content = content.replace(
  "relative overflow-hidden p-6 rounded-2xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6 border transition-all duration-500 shadow-xl",
  "relative overflow-hidden p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6 border transition-all duration-500 shadow-xl"
);

// 5. Insert Filters and Search Bar before Data Container
const filtersUI = `
        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input 
                    type="text" 
                    placeholder="Search by Batch Title or Holder Name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-glass border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-xl backdrop-blur-md"
                />
            </div>
            
            <div className="flex bg-black/40 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 overflow-x-auto custom-scrollbar self-start md:self-stretch">
                {['All', 'Active', 'Pending', 'Revoked'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={\`
                            px-6 py-2 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap
                            \${statusFilter === status 
                                ? (status === 'All' ? 'bg-blue-600 text-white shadow-lg' :
                                   status === 'Active' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                                   status === 'Pending' ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]' :
                                   'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]') 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'}
                        \`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>

        {/* Data Container */}`;

content = content.replace("{/* Data Container */}", filtersUI);

// 6. Update mapping to use filteredPosts 
content = content.replace(
  "           ) : posts.length === 0 ? (",
  "           ) : filteredPosts.length === 0 ? ("
);

// 7. Update Empty state text
content = content.replace(
  "<p className=\"text-slate-300 text-xl font-medium mb-2\">Your vault is empty</p>",
  `<p className="text-slate-300 text-xl font-medium mb-2">
                  {posts.length === 0 ? "Your vault is empty" : "No matches found"}
              </p>`
);

content = content.replace(
  "<p className=\"text-slate-500\">You haven't issued any document batches yet.</p>",
  `<p className="text-slate-500">
                  {posts.length === 0 ? "You haven't issued any document batches yet." : "Try adjusting your search criteria or status filter."}
              </p>`
);

content = content.replace(
  "{posts.map((post, idx) => (",
  "{filteredPosts.map((post, idx) => ("
);

fs.writeFileSync(file, content);
console.log('Patch applied successfully.');
