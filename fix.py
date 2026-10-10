import sys

file_path = r'c:\projects\ELSH-Ecommerce\views\user\shop\index.ejs'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

lines[245:258] = [
    '                  <button class="page-btn nav-btn" <%=currentPage===1 ? \'disabled\' : \'\' %> onclick="<%- `changePage(${currentPage - 1})` %>">&lt;</button>\n',
    '                  <div class="page-numbers">\n',
    '                    <% for (let i=1; i <=totalPages; i++) { %>\n',
    '                      <button class="page-btn <%= currentPage === i ? \'active\' : \'\' %>" onclick="<%- `changePage(${i})` %>">\n',
    '                        <%= i.toString().padStart(2, \'0\' ) %>\n',
    '                      </button>\n',
    '                      <% } %>\n',
    '                  </div>\n',
    '                  <button class="page-btn nav-btn" <%=currentPage===totalPages ? \'disabled\' : \'\' %> onclick="<%- `changePage(${currentPage + 1})` %>">&gt;\n',
    '                  </button>\n'
]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done!')
